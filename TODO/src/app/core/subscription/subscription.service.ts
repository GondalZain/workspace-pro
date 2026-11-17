import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../api/api.config';

/**
 * Frontend subscription capability map mirroring backend SUBSCRIPTION_PLANS.
 * Any feature NOT listed in a plan's feature map is considered ALLOWED FOR EVERYONE by default.
 */
export const FRONTEND_SUBSCRIPTION_PLANS: Record<string, { id: string; name: string; features: Record<string, boolean> }> = {
  trial: {
    id: 'trial',
    name: 'Free Trial',
    features: {
      'tasks.dynamic_statuses': false,
      'tasks.mentions_comments': false,
      'timesheet.logging': false,
      'workspace.custom_branding': false,
      'timesheet.export': false,
      'tasks.dependencies': false,
      'kanban.drag_drop': false
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    features: {
      'tasks.dynamic_statuses': true,
      'tasks.mentions_comments': false,
      'timesheet.logging': true,
      'workspace.custom_branding': false,
      'timesheet.export': false,
      'tasks.dependencies': false,
      'kanban.drag_drop': false
    }
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra Plan',
    features: {
      'tasks.dynamic_statuses': true,
      'tasks.mentions_comments': true,
      'timesheet.logging': true,
      'workspace.custom_branding': true,
      'timesheet.export': true,
      'tasks.dependencies': true,
      'kanban.drag_drop': true
    }
  }
};

// Backward-compatibility alias for legacy 'monthly'
(FRONTEND_SUBSCRIPTION_PLANS as any)['monthly'] = FRONTEND_SUBSCRIPTION_PLANS['pro'];

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly auth = inject(AuthService);

  readonly isModalOpen = signal(false);
  readonly targetFeature = signal<string | null>(null);

  readonly currentPlanId = computed(() => {
    const user = this.auth.userSignal();
    const rawId = user?.company?.planId || 'trial';
    // Normalize legacy 'monthly' to 'pro'
    return rawId === 'monthly' ? 'pro' : rawId;
  });

  readonly isSuperAdmin = computed(() => {
    return this.auth.userSignal()?.role === 'super_admin';
  });

  readonly isAdmin = computed(() => {
    const user = this.auth.userSignal();
    return user?.role === 'admin' || user?.role === 'super_admin' || user?.permissions?.includes('users.manage') === true;
  });

  private readonly http = inject(HttpClient);

  getCurrentSubscription() {
    return this.http.get<{
      companyId: number;
      companyName: string;
      planId: string;
      planName: string;
      price: number;
      subscriptionStatus: string;
      trialEndsAt: string | null;
      currentPeriodEnd: string | null;
      createdAt: string;
      features: Record<string, boolean>;
      availablePlans: any;
      billingHistory: any[];
    }>(`${API_BASE_URL}/subscriptions/current`);
  }

  changePlan(planId: string, cardDetails?: any) {
    return this.http.post<{
      success: boolean;
      message: string;
      company: any;
      plan: any;
    }>(`${API_BASE_URL}/subscriptions/change-plan`, { planId, cardDetails });
  }

  toggleAutoDebit(enabled: boolean) {
    return this.http.post<{ success: boolean; autoDebitEnabled: boolean; message: string }>(
      `${API_BASE_URL}/subscriptions/toggle-auto-debit`,
      { enabled }
    );
  }

  addCard(payload: { cardholderName: string; cardNumber: string; expDate: string; isDefault?: boolean }) {
    return this.http.post<{ success: boolean; message: string; card: any }>(
      `${API_BASE_URL}/subscriptions/cards`,
      payload
    );
  }

  deleteCard(cardId: number) {
    return this.http.delete<{ success: boolean; message: string }>(
      `${API_BASE_URL}/subscriptions/cards/${cardId}`
    );
  }

  updateCard(cardId: number, payload: { cardholderName: string; expDate: string }) {
    return this.http.put<{ success: boolean; message: string }>(
      `${API_BASE_URL}/subscriptions/cards/${cardId}`,
      payload
    );
  }

  setDefaultCard(cardId: number) {
    return this.http.patch<{ success: boolean; message: string }>(
      `${API_BASE_URL}/subscriptions/cards/${cardId}/default`,
      {}
    );
  }

  openModal(featureKey?: string): void {
    this.targetFeature.set(featureKey || null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.targetFeature.set(null);
  }

  readonly isExpired = computed(() => {
    if (this.isSuperAdmin()) return false;
    const user = this.auth.userSignal();
    const comp = user?.company;
    if (!comp) return false;

    if (comp.subscriptionStatus === 'expired' || comp.subscriptionStatus === 'suspended') {
      return true;
    }

    const now = new Date();
    if (comp.planId === 'trial' && comp.trialEndsAt && new Date(comp.trialEndsAt) < now) {
      return true;
    }

    if (comp.currentPeriodEnd && new Date(comp.currentPeriodEnd) < now) {
      return true;
    }

    return false;
  });

  /**
   * Check if the workspace subscription has access to a specific feature.
   * If not explicitly restricted (false), it is allowed for everyone.
   */
  hasFeature(featureKey: string): boolean {
    if (this.isSuperAdmin()) return true;
    if (this.isExpired()) return false;

    const planId = this.currentPlanId();
    const plan = FRONTEND_SUBSCRIPTION_PLANS[planId] || FRONTEND_SUBSCRIPTION_PLANS['trial'];
    
    if (plan.features && plan.features[featureKey] === false) {
      return false;
    }
    return true;
  }

  /**
   * Returns human-readable minimum plan name required for an upgrade prompt
   */
  getRequiredPlanName(featureKey: string): string {
    if (FRONTEND_SUBSCRIPTION_PLANS['pro']?.features[featureKey]) {
      return 'Pro Plan';
    }
    return 'Ultra Plan';
  }
}
