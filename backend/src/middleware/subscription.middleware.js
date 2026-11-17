const { hasPlanFeature } = require('../config/subscription-plans');
const { pool } = require('../config/database');

/**
 * Cache company plan in memory for fast lookup (cleared on update)
 */
const companyPlanCache = new Map();

async function getCompanySubscription(companyId) {
  if (!companyId) return null;
  const numId = Number(companyId);
  if (companyPlanCache.has(numId)) {
    return companyPlanCache.get(numId);
  }

  const [rows] = await pool.execute(
    'SELECT id, plan_id, subscription_status, trial_ends_at, current_period_end FROM companies WHERE id = ?',
    [numId]
  );
  if (!rows[0]) return null;

  const data = {
    planId: rows[0].plan_id || 'trial',
    status: rows[0].subscription_status || 'active',
    trialEndsAt: rows[0].trial_ends_at || null,
    currentPeriodEnd: rows[0].current_period_end || null
  };
  companyPlanCache.set(numId, data);
  return data;
}

function clearCompanySubscriptionCache(companyId) {
  if (companyId) {
    companyPlanCache.delete(Number(companyId));
  } else {
    companyPlanCache.clear();
  }
}

/**
 * Express middleware to enforce feature access by plan
 * Super Admins bypass all subscription checks
 */
function requireFeature(featureKey) {
  return async function subscriptionMiddleware(req, res, next) {
    try {
      if (req.user?.isSuperAdmin) {
        return next();
      }

      const companyId = req.user?.companyId;
      if (!companyId) {
        // Individual/Legacy users have standard baseline access
        if (!hasPlanFeature('trial', featureKey)) {
          return res.status(403).json({
            code: 'SUBSCRIPTION_UPGRADE_REQUIRED',
            error: `Feature '${featureKey}' is not available on your current plan.`
          });
        }
        return next();
      }

      const sub = await getCompanySubscription(companyId);
      const planId = sub?.planId || 'trial';

      const isAllowed = hasPlanFeature(planId, featureKey);
      if (!isAllowed) {
        return res.status(403).json({
          code: 'SUBSCRIPTION_UPGRADE_REQUIRED',
          error: `This feature is not included in your workspace's current subscription. Please upgrade to unlock it.`,
          requiredFeature: featureKey,
          currentPlan: planId
        });
      }

      // Check if plan has expired
      const now = new Date();
      if (sub?.status === 'expired' || sub?.status === 'suspended') {
        return res.status(403).json({
          code: 'SUBSCRIPTION_EXPIRED',
          error: 'Your workspace subscription has expired. Please upgrade or renew your plan to continue modifying settings.',
          currentPlan: planId
        });
      }

      if (planId === 'trial' && sub?.trialEndsAt && new Date(sub.trialEndsAt) < now) {
        return res.status(403).json({
          code: 'SUBSCRIPTION_EXPIRED',
          error: 'Your Free Trial has expired. Please upgrade to Monthly Plan or Pro Plan to continue.',
          currentPlan: planId
        });
      }

      if (sub?.currentPeriodEnd && new Date(sub.currentPeriodEnd) < now) {
        return res.status(403).json({
          code: 'SUBSCRIPTION_EXPIRED',
          error: 'Your workspace subscription billing period has ended. Please renew to continue.',
          currentPlan: planId
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  getCompanySubscription,
  clearCompanySubscriptionCache,
  requireFeature
};
