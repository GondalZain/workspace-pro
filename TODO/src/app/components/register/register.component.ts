import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyThemeService } from '../../core/theme/company-theme.service';
import { PublicNavbarComponent } from '../public-navbar/public-navbar.component';
import { StripeCardElementComponent } from '../stripe-card-element/stripe-card-element.component';
import { StripeService } from '../../core/api/stripe.service';

interface PlanSummary {
  id: string;
  name: string;
  badge: string;
  price: string;
  cadence: string;
  features: string[];
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PublicNavbarComponent, StripeCardElementComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly companyTheme = inject(CompanyThemeService);
  private readonly stripeService = inject(StripeService);

  isSubmitting = false;
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  protected readonly isCardValid = signal(false);
  protected readonly isPaidPlan = signal(false);

  readonly availablePlans: PlanSummary[] = [
    {
      id: 'trial',
      name: 'Free Trial',
      badge: '1-MONTH FREE TRIAL',
      price: '$0',
      cadence: '/ 1 month free',
      features: [
        'Standard Kanban Board & Tasks',
        'Built-in Status Workflow (To Do, In Progress, Done)',
        'Task Checklists & Sub-item Tracking',
        'Due Dates, Priority Flags & Tagging',
        'Calendar Schedule & Milestone View'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      badge: 'MOST POPULAR',
      price: '$19',
      cadence: '/ month',
      features: [
        'Unlimited Workspaces & Kanban Boards',
        'Custom Dynamic Status Pipelines & Color Coding',
        'Calendar Schedule & Due Date Tracking',
        'Timesheets & Work Hours Logging'
      ]
    },
    {
      id: 'ultra',
      name: 'Ultra Plan',
      badge: 'ULTRA POWER',
      price: '$29',
      cadence: '/ month',
      features: [
        'Everything in Pro Plan',
        'Interactive Kanban Card Drag & Drop',
        'Team @Mentions & Task Comments',
        'Custom Company Branding & Workspace Themes',
        'Advanced Task Dependencies & Milestones',
        'Detailed Timesheet Productivity & Hours Export'
      ]
    }
  ];

  selectedPlan = signal<PlanSummary>(this.availablePlans[0]);

  readonly registerForm: FormGroup = this.fb.group({
    companyName: ['', [Validators.required]],
    workEmail: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required]]
  });

  ngOnInit(): void {
    // Registration is default platform workspace creation - no tenant company override
    this.companyTheme.resetDefaultTheme();

    this.route.queryParams.subscribe(params => {
      const planId = params['plan'] || 'trial';
      const isAnnual = params['billing'] === 'annual';

      this.applyPlanById(planId, isAnnual);
    });
  }

  changePlan(planId: string): void {
    this.applyPlanById(planId, false);
  }

  private applyPlanById(planId: string, isAnnual: boolean = false): void {
    if (planId === 'pro' || planId === 'monthly') {
      this.isPaidPlan.set(true);
      this.selectedPlan.set({
        id: 'pro',
        name: 'Pro Plan',
        badge: 'MOST POPULAR',
        price: isAnnual ? '$15' : '$19',
        cadence: '/ month',
        features: [
          'Unlimited Workspaces & Kanban Boards',
          'Custom Dynamic Status Pipelines & Color Coding',
          'Calendar Schedule & Due Date Tracking',
          'Timesheets & Work Hours Logging'
        ]
      });
    } else if (planId === 'ultra') {
      this.isPaidPlan.set(true);
      this.selectedPlan.set({
        id: 'ultra',
        name: 'Ultra Plan',
        badge: 'ULTRA POWER',
        price: isAnnual ? '$24' : '$29',
        cadence: '/ month',
        features: [
          'Everything in Pro Plan',
          'Interactive Kanban Card Drag & Drop',
          'Team @Mentions & Task Comments',
          'Custom Company Branding & Workspace Themes',
          'Advanced Task Dependencies & Milestones',
          'Detailed Timesheet Productivity & Hours Export'
        ]
      });
    } else {
      // Default to 1-Month Free Trial: No payment required!
      this.isPaidPlan.set(false);
      this.isCardValid.set(true);
      this.selectedPlan.set({
        id: 'trial',
        name: 'Free Trial',
        badge: '1-MONTH FREE TRIAL',
        price: '$0',
        cadence: '/ 1 month free',
        features: [
          'Standard Kanban Board & Tasks',
          'Built-in Status Workflow (To Do, In Progress, Done)',
          'Task Checklists & Sub-item Tracking',
          'Due Dates, Priority Flags & Tagging',
          'Calendar Schedule & Milestone View'
        ]
      });
    }
  }

  onCardValidated(event: { valid: boolean; paymentMethodId?: string }): void {
    this.isCardValid.set(event.valid);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.isSubmitting) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formVal = this.registerForm.value;
    const planId = this.selectedPlan()?.id || 'trial';
    this.auth.registerWorkspace({
      companyName: formVal.companyName,
      workEmail: formVal.workEmail,
      fullName: formVal.fullName,
      planId
    }).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        const msg = res.message || 'Workspace registered successfully! Your account is waiting for super admin approval.';
        this.successMessage.set(msg);
        this.registerForm.reset({
          companyName: '',
          workEmail: '',
          fullName: ''
        });
        this.registerForm.markAsPristine();
        this.registerForm.markAsUntouched();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage.set(err.error?.error || 'Registration failed. Please try again.');
      }
    });
  }
}