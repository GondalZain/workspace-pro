const express = require('express');
const { pool } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth.middleware');
const { SUBSCRIPTION_PLANS } = require('../../config/subscription-plans');
const { clearCompanySubscriptionCache } = require('../../middleware/subscription.middleware');
const notificationsController = require('../notifications/notifications.controller');

const router = express.Router();

/**
 * POST /api/subscriptions/webhook
 * Public Stripe webhook endpoint. Receives events from Stripe (must be before requireAuth).
 */
router.post('/webhook', async (req, res) => {
  const stripeService = require('../../services/stripe.service');
  const { stripe: stripeConfig } = require('../../config/env');
  const stripe = stripeService.getStripe();
  const sig = req.headers['stripe-signature'];
  const payload = req.rawBody || req.body;

  let event;
  try {
    if (stripe && stripeConfig.webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(payload, sig, stripeConfig.webhookSecret);
    } else {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle Stripe events
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'invoice.paid': {
        const dataObj = event.data.object;
        console.log(`Payment confirmed via webhook (${event.type}):`, dataObj.id);
        break;
      }
      case 'invoice.payment_failed': {
        console.warn('Subscription invoice payment failed:', event.data.object.id);
        break;
      }
      default:
        console.log(`Received Stripe event: ${event.type}`);
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook event:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

router.use(requireAuth);

/**
 * GET /api/subscriptions/current
 * Returns the current company's subscription details, expiration/renewal dates, plan features, and billing history.
 */
router.get('/current', async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) {
      return res.status(400).json({ error: 'No workspace associated with user.' });
    }

    const [companies] = await pool.query(
      `SELECT id, name, plan_id, subscription_status, trial_ends_at, current_period_end, created_at, auto_debit_enabled, trial_used 
       FROM companies WHERE id = ?`,
      [companyId]
    );

    if (!companies || companies.length === 0) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    const company = companies[0];
    const planId = company.plan_id || 'trial';
    const planConfig = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.trial;

    const isTrialExpired = company.trial_used || 
      (company.plan_id !== 'trial') || 
      (company.trial_ends_at && new Date(company.trial_ends_at) < new Date());

    // Fetch billing history
    const [billingHistory] = await pool.query(
      `SELECT id, invoice_number, plan_id, plan_name, amount, currency, status, billing_date, period_start, period_end, payment_method 
       FROM company_billing_history 
       WHERE company_id = ? 
       ORDER BY billing_date DESC`,
      [companyId]
    );

    // Fetch saved payment cards
    const [savedCards] = await pool.query(
      `SELECT id, cardholder_name, brand, last4, exp_month, exp_year, is_default, created_at 
       FROM company_payment_cards 
       WHERE company_id = ? 
       ORDER BY is_default DESC, id DESC`,
      [companyId]
    );

    res.json({
      companyId: company.id,
      companyName: company.name,
      planId: planId,
      planName: planConfig.name,
      price: planConfig.price,
      subscriptionStatus: company.subscription_status || 'active',
      trialEndsAt: company.trial_ends_at,
      trialUsed: Boolean(company.trial_used) || (company.plan_id !== 'trial'),
      trialExpired: Boolean(isTrialExpired),
      currentPeriodEnd: company.current_period_end,
      createdAt: company.created_at,
      autoDebitEnabled: company.auto_debit_enabled !== 0 && company.auto_debit_enabled !== false,
      features: planConfig.features,
      availablePlans: SUBSCRIPTION_PLANS,
      billingHistory: billingHistory || [],
      savedCards: savedCards || []
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/change-plan
 * Allowed for company admins or super admins to update their workspace subscription plan.
 */
const authRepository = require('../auth/auth.repository');

router.post('/change-plan', async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const access = await authRepository.findAccessByUserId(Number(req.user.sub));
    const permissions = access.permissions || [];
    const isCompanyAdmin = userRole === 'admin' || userRole === 'super_admin' || access.role === 'admin' || access.role === 'super_admin' || permissions.includes('users.manage');

    if (!isCompanyAdmin) {
      return res.status(403).json({
        code: 'ADMIN_ACCESS_REQUIRED',
        error: 'Only company administrators can change the workspace subscription. Please contact your administrator.'
      });
    }

    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) {
      return res.status(400).json({ error: 'No workspace associated with user.' });
    }

    const { planId, cardDetails } = req.body;
    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({ error: `Invalid plan ID "${planId}". Valid plans: ${Object.keys(SUBSCRIPTION_PLANS).join(', ')}` });
    }

    const [currentComp] = await pool.query(
      'SELECT id, name, plan_id, trial_used, trial_ends_at FROM companies WHERE id = ?',
      [companyId]
    );
    if (!currentComp.length) return res.status(404).json({ error: 'Workspace not found.' });
    const companyRow = currentComp[0];

    // Enforce ONE-TIME FREE TRIAL policy:
    // If company already used trial or upgraded to a paid plan, they cannot switch back to trial!
    if (planId === 'trial') {
      const isAlreadyUsed = companyRow.trial_used || companyRow.plan_id !== 'trial' || (companyRow.trial_ends_at && new Date(companyRow.trial_ends_at) < new Date());
      if (isAlreadyUsed) {
        return res.status(400).json({
          error: 'Your workspace has already utilized the one-time Free Trial. Please select the Pro or Ultra plan to continue.'
        });
      }
    }

    const targetPlan = SUBSCRIPTION_PLANS[planId];
    
    // Process real Stripe charge if paid tier
    let paymentDetails = { brand: 'Credit Card', last4: '4242', transactionId: null };
    if (targetPlan.price > 0 && planId !== 'trial') {
      const companyName = companyRow.name || 'Workspace';
      const secureIdempotency = `upgrade_${companyId}_${planId}_${req.body.idempotencyKey || Date.now()}`;
      
      const chargeResult = await stripeService.processCardCharge({
        planId,
        amount: targetPlan.price,
        email: req.user.email,
        companyName,
        cardDetails,
        idempotencyKey: secureIdempotency
      });
      paymentDetails = chargeResult;
    }

    // Calculate new period end (30 days from now)
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    // If user provided autoDebit preference, update it on company
    const autoDebitParam = cardDetails?.autoDebit !== undefined ? Boolean(cardDetails.autoDebit) : true;

    // Update company in database (mark trial_used = TRUE so trial can never be claimed again)
    await pool.execute(
      `UPDATE companies 
       SET plan_id = ?, subscription_status = 'active', current_period_end = ?, trial_ends_at = NULL, auto_debit_enabled = ?, trial_used = TRUE 
       WHERE id = ?`,
      [planId, periodEnd, autoDebitParam, companyId]
    );

    // Save payment card ONLY if user explicitly consented (PCI-DSS & Card Storage Regulations)
    if (cardDetails?.saveCard && cardDetails?.cardNumber) {
      const cleanNumber = cardDetails.cardNumber.toString().replace(/\D/g, '');
      const last4 = cleanNumber.slice(-4) || '4242';
      let brand = paymentDetails.brand || 'Visa';
      const cardholder = (cardDetails.cardholderName || req.user.name || 'Workspace Customer').trim();
      const stripeMethodId = paymentDetails.paymentMethodId || `pm_mock_${Date.now()}`;

      // Check if this card last4 is already saved for this company
      const [existingCards] = await pool.query(
        'SELECT id FROM company_payment_cards WHERE company_id = ? AND last4 = ?',
        [companyId, last4]
      );
      if (existingCards.length === 0) {
        // Set all other cards non-default
        await pool.query('UPDATE company_payment_cards SET is_default = FALSE WHERE company_id = ?', [companyId]);
        // Store only cardholder name, last4, brand, and secure Stripe token
        await pool.query(
          `INSERT INTO company_payment_cards (company_id, cardholder_name, brand, stripe_payment_method_id, last4, is_default)
           VALUES (?, ?, ?, ?, ?, TRUE)`,
          [companyId, cardholder, brand, stripeMethodId, last4]
        );
      } else {
        // If card exists, update its token and cardholder name, and make it default
        await pool.query('UPDATE company_payment_cards SET is_default = FALSE WHERE company_id = ?', [companyId]);
        await pool.query(
          `UPDATE company_payment_cards 
           SET cardholder_name = ?, stripe_payment_method_id = ?, is_default = TRUE 
           WHERE id = ?`,
          [cardholder, stripeMethodId, existingCards[0].id]
        );
      }
    }

    // Add entry in company_billing_history
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const methodStr = paymentDetails.transactionId
      ? `${paymentDetails.brand} (•••• ${paymentDetails.last4}) [${paymentDetails.transactionId}]`
      : 'Free Trial Plan';

    await pool.execute(
      `INSERT INTO company_billing_history 
       (company_id, invoice_number, plan_id, plan_name, amount, currency, status, billing_date, period_start, period_end, payment_method) 
       VALUES (?, ?, ?, ?, ?, 'USD', 'paid', ?, ?, ?, ?)`,
      [companyId, invoiceNum, planId, targetPlan.name, targetPlan.price, now, now, periodEnd, methodStr]
    );

    // Clear backend cache so new plan features are active immediately
    clearCompanySubscriptionCache(companyId);

    // Broadcast plan update to all connected users in this company and super admins in real-time
    try {
      notificationsController.sendToCompany(companyId, 'subscription_plan_updated', {
        companyId: Number(companyId),
        planId: planId,
        planName: targetPlan.name,
        subscriptionStatus: 'active'
      });
      notificationsController.sendToSuperAdmins('subscription_plan_updated', {
        companyId: Number(companyId),
        planId: planId,
        planName: targetPlan.name,
        subscriptionStatus: 'active'
      });
    } catch (e) {
      console.warn('Failed to broadcast subscription update:', e);
    }

    // Fetch updated details
    const [updatedCompany] = await pool.query(
      `SELECT id, name, plan_id, subscription_status, trial_ends_at, current_period_end 
       FROM companies WHERE id = ?`,
      [companyId]
    );

    res.json({
      success: true,
      message: `Workspace subscription successfully upgraded to ${targetPlan.name}!`,
      company: updatedCompany[0],
      plan: targetPlan,
      invoice: {
        invoice_number: invoiceNum,
        plan_name: targetPlan.name,
        amount: targetPlan.price,
        currency: 'USD',
        billing_date: now.toISOString(),
        period_start: now.toISOString(),
        period_end: periodEnd.toISOString(),
        payment_method: methodStr,
        status: 'PAID'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/create-payment-intent
 * Creates Stripe PaymentIntent for subscription checkout
 */
const stripeService = require('../../services/stripe.service');

router.post('/create-payment-intent', async (req, res, next) => {
  try {
    const { planId, email, companyName } = req.body;
    const userEmail = email || req.user?.email || '';
    const intent = await stripeService.createPaymentIntent({
      planId,
      email: userEmail,
      companyName
    });
    res.json(intent);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/toggle-auto-debit
 * Toggles automated renewal payment deduction for workspace.
 */
router.post('/toggle-auto-debit', async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) return res.status(400).json({ error: 'No workspace associated with user.' });

    const { enabled } = req.body;
    const isEnabled = enabled !== false && enabled !== 0;

    await pool.query('UPDATE companies SET auto_debit_enabled = ? WHERE id = ?', [isEnabled, companyId]);

    res.json({
      success: true,
      autoDebitEnabled: isEnabled,
      message: isEnabled ? 'Automated payment deduction enabled.' : 'Automated payment deduction paused.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscriptions/cards
 * Adds a new payment card to the company workspace.
 */
router.post('/cards', async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    if (!companyId) return res.status(400).json({ error: 'No workspace associated with user.' });

    const { cardholderName, cardNumber, expDate, isDefault } = req.body;
    if (!cardholderName || !cardNumber) {
      return res.status(400).json({ error: 'Cardholder name and card number are required.' });
    }

    const cleanNumber = cardNumber.toString().replace(/\D/g, '');
    const last4 = cleanNumber.slice(-4) || '4242';

    // Simple brand detection
    let brand = 'Visa';
    if (/^5[1-5]/.test(cleanNumber)) brand = 'Mastercard';
    else if (/^3[47]/.test(cleanNumber)) brand = 'Amex';
    else if (/^6(?:011|5)/.test(cleanNumber)) brand = 'Discover';

    if (isDefault) {
      await pool.query('UPDATE company_payment_cards SET is_default = FALSE WHERE company_id = ?', [companyId]);
    }

    const tokenParam = req.body.stripePaymentMethodId || `pm_tok_${Date.now()}_${last4}`;

    const [result] = await pool.query(
      `INSERT INTO company_payment_cards (company_id, cardholder_name, brand, stripe_payment_method_id, last4, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [companyId, cardholderName.trim(), brand, tokenParam, last4, Boolean(isDefault)]
    );

    const [newCard] = await pool.query('SELECT * FROM company_payment_cards WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Card added successfully.',
      card: newCard[0]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/subscriptions/cards/:id
 * Removes a saved payment card.
 */
router.delete('/cards/:id', async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    const cardId = Number(req.params.id);

    await pool.query('DELETE FROM company_payment_cards WHERE id = ? AND company_id = ?', [cardId, companyId]);

    res.json({
      success: true,
      message: 'Card removed successfully.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/subscriptions/cards/:id
 * Updates card details (cardholder name, expiry date).
 */
router.put('/cards/:id', async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    const cardId = Number(req.params.id);
    const { cardholderName, expDate } = req.body;

    let expMonth = 12;
    let expYear = 28;
    if (expDate && expDate.includes('/')) {
      const [m, y] = expDate.split('/');
      expMonth = parseInt(m, 10) || 12;
      expYear = parseInt(y, 10) || 28;
    }

    await pool.query(
      `UPDATE company_payment_cards 
       SET cardholder_name = COALESCE(?, cardholder_name),
           exp_month = ?,
           exp_year = ?
       WHERE id = ? AND company_id = ?`,
      [cardholderName ? cardholderName.trim() : null, expMonth, expYear, cardId, companyId]
    );

    res.json({
      success: true,
      message: 'Card details updated successfully.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/subscriptions/cards/:id/default
 * Sets a payment card as default.
 */
router.patch('/cards/:id/default', async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    const cardId = Number(req.params.id);

    await pool.query('UPDATE company_payment_cards SET is_default = FALSE WHERE company_id = ?', [companyId]);
    await pool.query('UPDATE company_payment_cards SET is_default = TRUE WHERE id = ? AND company_id = ?', [cardId, companyId]);

    res.json({
      success: true,
      message: 'Default payment card updated.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
