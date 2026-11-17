import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SubscriptionService, FRONTEND_SUBSCRIPTION_PLANS } from '../../core/subscription/subscription.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-subscription-modal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './subscription-modal.html',
  styleUrl: './subscription-modal.css'
})
export class SubscriptionModalComponent {
  protected readonly subService = inject(SubscriptionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isOpen = computed(() => this.subService.isModalOpen());
  protected readonly currentPlanId = computed(() => this.subService.currentPlanId());
  protected readonly targetFeature = computed(() => this.subService.targetFeature());
  protected readonly isSuperAdmin = computed(() => this.subService.isSuperAdmin());

  protected readonly user = computed(() => this.auth.getUser());
  protected readonly company = computed(() => this.user()?.company);
  protected readonly companyName = computed(() => this.company()?.name || 'Workspace');

  protected readonly currentPlanName = computed(() => {
    const id = this.currentPlanId();
    return FRONTEND_SUBSCRIPTION_PLANS[id]?.name || 'Free Trial';
  });

  protected readonly plans = [
    {
      id: 'trial',
      name: 'Free Trial',
      badge: '1-Month Trial',
      price: '$0',
      period: '/ month',
      note: '30 days full workspace access',
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
      note: 'Flexible month-to-month billing',
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
      badge: 'Ultra Power',
      price: '$29',
      period: '/ month',
      note: 'Full team collaboration & Kanban drag & drop',
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

  protected readonly isAdmin = computed(() => this.subService.isAdmin());
  protected readonly contactAdminMessage = computed(() => 
    'Subscription upgrades can only be performed by workspace administrators. Please contact your company administrator to unlock this plan.'
  );

  protected readonly showNotice = computed(() => !this.isAdmin());

  close(): void {
    this.subService.closeModal();
  }

  selectPlan(planId: string): void {
    if (!this.isAdmin()) {
      alert(this.contactAdminMessage());
      return;
    }
    this.close();
    this.router.navigate(['/admin/subscription'], { queryParams: { selected: planId } });
  }
}
