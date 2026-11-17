import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SubscriptionService, FRONTEND_SUBSCRIPTION_PLANS } from '../../../core/subscription/subscription.service';
import { AuthService } from '../../../core/auth/auth.service';

interface BillingRecord {
  id: number;
  invoice_number: string;
  plan_id: string;
  plan_name: string;
  amount: number | string;
  currency: string;
  status: string;
  billing_date: string;
  period_start: string | null;
  period_end: string | null;
  payment_method: string;
}

interface PaymentCard {
  id: number;
  cardholder_name: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

interface CurrentSubscriptionData {
  companyId: number;
  companyName: string;
  planId: string;
  planName: string;
  price: number;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  trialUsed?: boolean;
  trialExpired?: boolean;
  currentPeriodEnd: string | null;
  createdAt: string;
  autoDebitEnabled: boolean;
  features: Record<string, boolean>;
  availablePlans: any;
  billingHistory: BillingRecord[];
  savedCards: PaymentCard[];
}

import { StripeCardElementComponent } from '../../../components/stripe-card-element/stripe-card-element.component';

@Component({
  selector: 'app-admin-subscription-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StripeCardElementComponent],
  templateUrl: './subscription.page.html',
  styleUrl: './subscription.page.css'
})
export class AdminSubscriptionPage implements OnInit {
  private readonly subService = inject(SubscriptionService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(true);
  protected readonly updating = signal(false);
  protected readonly feedbackMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  private feedbackTimer: any = null;

  protected setFeedback(type: 'success' | 'error', text: string, autoDismissMs = 4500): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
    this.feedbackMessage.set({ type, text });
    if (autoDismissMs > 0) {
      this.feedbackTimer = setTimeout(() => {
        this.feedbackMessage.set(null);
        this.feedbackTimer = null;
      }, autoDismissMs);
    }
  }
  
  protected readonly activeTab = signal<'plans' | 'billing' | 'cards'>('plans');
  protected readonly subscription = signal<CurrentSubscriptionData | null>(null);
  protected readonly autoDebitEnabled = signal(true);
  protected readonly savedCards = signal<PaymentCard[]>([]);
  protected readonly isAddingCard = signal(false);
  protected readonly editingCard = signal<PaymentCard | null>(null);
  protected readonly editCardData = signal({ cardholderName: '', expDate: '' });
  protected readonly selectedCheckoutPlan = signal<{ id: string; name: string; price: string; period: string } | null>(null);
  protected readonly selectedPaymentCardId = signal<number | 'new'>('new');
  protected readonly isCardValid = signal(false);
  protected readonly checkoutCardDetails = signal<any>(null);
  protected readonly checkoutSaveCard = signal(true);
  protected readonly checkoutAutoDebit = signal(true);
  protected readonly isNewCardValid = signal(false);
  protected readonly generatedInvoice = signal<any | null>(null);
  protected readonly selectedInvoice = signal<BillingRecord | null>(null);
  protected readonly newCardData = signal({
    cardholderName: '',
    cardNumber: '',
    expDate: '',
    isDefault: true
  });

  protected readonly currentPlanId = computed(() => this.subscription()?.planId || 'trial');
  protected readonly companyName = computed(() => this.subscription()?.companyName || this.auth.getUser()?.company?.name || 'Workspace');

  protected readonly isTrialExpired = computed(() => {
    const sub = this.subscription();
    if (!sub) return false;
    if (sub.trialExpired) return true;
    if (sub.planId === 'trial' && sub.trialEndsAt && new Date(sub.trialEndsAt) < new Date()) {
      return true;
    }
    return false;
  });

  protected readonly expirationInfo = computed(() => {
    const sub = this.subscription();
    if (!sub) return { label: 'Status', dateText: 'Active', isTrial: false, daysRemaining: null };

    if (sub.planId === 'trial' && sub.trialEndsAt) {
      const trialEnd = new Date(sub.trialEndsAt);
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const hasExpired = diffDays <= 0 || sub.trialExpired;
      return {
        label: hasExpired ? 'Trial Status' : 'Trial Expiration Date',
        dateText: hasExpired ? 'Expired' : trialEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isTrial: true,
        daysRemaining: hasExpired ? 0 : diffDays
      };
    }

    if (sub.currentPeriodEnd) {
      const renewDate = new Date(sub.currentPeriodEnd);
      return {
        label: 'Renewal / Expiration Date',
        dateText: renewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isTrial: false,
        daysRemaining: null
      };
    }

    return {
      label: 'Billing Cycle',
      dateText: 'Monthly Active',
      isTrial: false,
      daysRemaining: null
    };
  });

  protected readonly availablePlansList = [
    {
      id: 'trial',
      name: 'Free Trial',
      badge: 'Starter',
      price: '$0',
      period: '/ month',
      note: '30-day initial workspace evaluation',
      features: [
        'Standard Kanban Board & Tasks',
        'Built-in Status Workflow (To Do, In Progress, Done)',
        'Checklists, Due Dates & Flags',
        'Calendar Schedule Overview',
        'Cloud File Attachments'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      badge: 'Popular',
      price: '$19',
      period: '/ month',
      note: 'Flexible workspace team power',
      features: [
        'Unlimited Workspaces & Kanban Boards',
        'Custom Dynamic Status Pipelines & Colors',
        'Calendar Schedule & Due Date Tracking',
        'Timesheets & Work Hours Logging',
        'Cloud File Storage & Attachments',
        'Priority Technical Support'
      ]
    },
    {
      id: 'ultra',
      name: 'Ultra Plan',
      badge: 'Ultra Tier',
      price: '$29',
      period: '/ month',
      note: 'Advanced collaboration, Kanban drag-and-drop & workflow automation',
      features: [
        'Everything in Pro Plan',
        'Interactive Kanban Card Drag & Drop',
        'Team @Mentions & Task Comments',
        'Custom Company Branding & Workspace Themes',
        'Advanced Task Dependencies & Milestones',
        'Detailed Timesheet Productivity & Hours Export',
        'High-Speed Secure Cloud Storage'
      ]
    }
  ];

  ngOnInit(): void {
    this.loadSubscriptionData();

    // Check query params to pre-highlight plan or switch tab
    this.route.queryParams.subscribe((params) => {
      if (params['tab'] === 'billing') {
        this.activeTab.set('billing');
      }
    });
  }

  loadSubscriptionData(): void {
    this.loading.set(true);
    this.subService.getCurrentSubscription().subscribe({
      next: (data: any) => {
        this.subscription.set(data as any);
        this.autoDebitEnabled.set(data.autoDebitEnabled !== false);
        this.savedCards.set(data.savedCards || []);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Failed to load subscription:', err);
        this.loading.set(false);
      }
    });
  }

  toggleAutoDebit(): void {
    const nextState = !this.autoDebitEnabled();
    this.autoDebitEnabled.set(nextState);
    this.subService.toggleAutoDebit(nextState).subscribe({
      next: (res) => {
        this.setFeedback('success', res.message, 3500);
      },
      error: (err) => {
        this.autoDebitEnabled.set(!nextState); // revert on error
        this.setFeedback('error', err.error?.error || 'Failed to update auto debit setting.', 4500);
      }
    });
  }

  onNewCardDetailsChange(details: { cardholderName: string; cardNumber: string; expDate: string; cvc: string; valid: boolean }): void {
    this.isNewCardValid.set(details.valid);
    this.newCardData.update(prev => ({
      ...prev,
      cardholderName: details.cardholderName,
      cardNumber: details.cardNumber,
      expDate: details.expDate
    }));
  }

  submitAddCard(): void {
    const card = this.newCardData();
    if (!card.cardholderName || !card.cardNumber || !card.expDate) {
      this.setFeedback('error', 'Please fill in cardholder name, card number, and expiry date.', 4000);
      return;
    }

    this.updating.set(true);
    this.subService.addCard(card).subscribe({
      next: (res) => {
        this.updating.set(false);
        this.isAddingCard.set(false);
        this.isNewCardValid.set(false);
        this.newCardData.set({
          cardholderName: '',
          cardNumber: '',
          expDate: '',
          isDefault: true
        });
        this.setFeedback('success', 'New card added successfully.', 3500);
        this.loadSubscriptionData();
      },
      error: (err) => {
        this.updating.set(false);
        this.setFeedback('error', err.error?.error || 'Failed to add card.', 4500);
      }
    });
  }

  deleteCard(cardId: number): void {
    if (!confirm('Are you sure you want to remove this payment card?')) return;

    this.updating.set(true);
    this.subService.deleteCard(cardId).subscribe({
      next: () => {
        this.updating.set(false);
        this.setFeedback('success', 'Card removed.', 3000);
        this.loadSubscriptionData();
      },
      error: (err) => {
        this.updating.set(false);
        this.setFeedback('error', err.error?.error || 'Failed to remove card.', 4500);
      }
    });
  }

  setDefaultCard(cardId: number): void {
    this.updating.set(true);
    this.subService.setDefaultCard(cardId).subscribe({
      next: () => {
        this.updating.set(false);
        this.setFeedback('success', 'Default card updated.', 3000);
        this.loadSubscriptionData();
      },
      error: (err) => {
        this.updating.set(false);
        this.setFeedback('error', err.error?.error || 'Failed to set default card.', 4500);
      }
    });
  }

  startEditCard(card: PaymentCard): void {
    this.editingCard.set(card);
    const m = card.exp_month < 10 ? `0${card.exp_month}` : `${card.exp_month}`;
    const y = `${card.exp_year}`.slice(-2);
    this.editCardData.set({
      cardholderName: card.cardholder_name,
      expDate: `${m}/${y}`
    });
  }

  cancelEditCard(): void {
    this.editingCard.set(null);
  }

  submitEditCard(): void {
    const card = this.editingCard();
    if (!card) return;

    const data = this.editCardData();
    if (!data.cardholderName || !data.expDate) {
      this.setFeedback('error', 'Please provide cardholder name and expiry date.', 4000);
      return;
    }

    this.updating.set(true);
    this.subService.updateCard(card.id, data).subscribe({
      next: (res) => {
        this.updating.set(false);
        this.editingCard.set(null);
        this.setFeedback('success', res.message || 'Card updated successfully.', 3500);
        this.loadSubscriptionData();
      },
      error: (err) => {
        this.updating.set(false);
        this.setFeedback('error', err.error?.error || 'Failed to update card details.', 4500);
      }
    });
  }

  selectPlan(targetPlanId: string): void {
    if (this.currentPlanId() === targetPlanId) return;

    const plan = this.availablePlansList.find((p) => p.id === targetPlanId);
    if (!plan) return;

    // Free Trial plan requires no payment
    if (plan.id === 'trial') {
      const confirmChange = confirm(`Switch workspace to Free Trial?`);
      if (!confirmChange) return;
      this.executePlanChange(plan.id, plan.name);
      return;
    }

    // Set default selected card
    const defaultCard = this.savedCards().find(c => c.is_default) || this.savedCards()[0];
    this.selectedPaymentCardId.set(defaultCard ? defaultCard.id : 'new');

    // Open Stripe checkout modal to collect or select card
    this.selectedCheckoutPlan.set({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      period: plan.period
    });
    this.isCardValid.set(defaultCard ? true : false);
  }

  closeCheckoutModal(): void {
    this.selectedCheckoutPlan.set(null);
    this.isCardValid.set(false);
    this.checkoutCardDetails.set(null);
  }

  closeInvoiceModal(): void {
    this.generatedInvoice.set(null);
    this.selectedInvoice.set(null);
    this.activeTab.set('billing');
  }

  viewInvoice(record: BillingRecord): void {
    this.selectedInvoice.set(record);
  }

  onCheckoutCardDetailsChange(details: { cardholderName: string; cardNumber: string; expDate: string; cvc: string; valid: boolean }): void {
    this.isCardValid.set(details.valid);
    this.checkoutCardDetails.set(details);
  }

  confirmPlanCheckout(): void {
    const plan = this.selectedCheckoutPlan();
    if (!plan) return;

    const selectedCardId = this.selectedPaymentCardId();

    let cardDetailsPayload: any = null;

    if (selectedCardId === 'new') {
      if (!this.isCardValid()) {
        this.setFeedback('error', 'Please provide valid payment card details before proceeding.', 4000);
        return;
      }
      cardDetailsPayload = {
        ...this.checkoutCardDetails(),
        saveCard: this.checkoutSaveCard(),
        autoDebit: this.checkoutAutoDebit()
      };
    } else {
      // Paying with a saved card
      const card = this.savedCards().find(c => c.id === selectedCardId);
      cardDetailsPayload = {
        savedCardId: selectedCardId,
        last4: card?.last4 || '4242',
        brand: card?.brand || 'Visa',
        autoDebit: this.checkoutAutoDebit()
      };
    }

    this.closeCheckoutModal();
    this.executePlanChange(plan.id, plan.name, cardDetailsPayload);
  }

  private executePlanChange(targetPlanId: string, planName: string, cardDetails?: any): void {
    this.updating.set(true);
    this.feedbackMessage.set(null);

    this.subService.changePlan(targetPlanId, cardDetails).subscribe({
      next: (res: any) => {
        this.updating.set(false);
        this.setFeedback('success', res.message || `Successfully switched to ${planName}!`, 4500);

        // Capture newly generated invoice for pop-up display
        if (res.invoice) {
          this.generatedInvoice.set(res.invoice);
        }

        // Instantly update current in-memory subscription signal
        const existingSub = this.subscription();
        if (existingSub) {
          this.subscription.set({
            ...existingSub,
            planId: targetPlanId,
            planName: planName,
            subscriptionStatus: 'active'
          });
        }

        // Immediately update stored auth user and broadcast across app signals
        const currentUser = this.auth.getUser();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            company: currentUser.company ? {
              ...currentUser.company,
              planId: targetPlanId,
              subscriptionStatus: 'active'
            } : null
          };
          this.auth.saveUser(updatedUser);
        }

        // Reload live subscription data and refresh fresh user state from server
        this.loadSubscriptionData();
        this.auth.refreshCurrentUser().subscribe({
          next: (freshUser) => {
            if (freshUser) {
              this.auth.saveUser(freshUser);
            }
          }
        });
      },
      error: (err: any) => {
        this.updating.set(false);
        this.setFeedback('error', err.error?.error || 'Failed to update subscription. Please try again.', 6000);
      }
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }
}
