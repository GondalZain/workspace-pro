import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CompanyThemeService } from '../../core/theme/company-theme.service';
import { PublicNavbarComponent } from '../public-navbar/public-navbar.component';
import { SeoService } from '../../core/seo/seo.service';

export interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  billingNote?: string;
  highlighted?: boolean;
  ctaText: string;
  features: string[];
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly companyTheme = inject(CompanyThemeService);
  private readonly seoService = inject(SeoService);

  isAnnual = false;

  ngOnInit(): void {
    // Enforce fixed platform color scheme on pricing page
    this.companyTheme.resetDefaultTheme();

    // SEO Optimization for Pricing Page
    this.seoService.setPageSeo({
      title: 'Pricing Plans for Teams | Workspace Pro',
      description: 'Compare Workspace Pro pricing plans for task management, Kanban boards, team collaboration, calendars, timesheets, and project tracking.',
      canonicalPath: '/pricing',
      ogType: 'website',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            '@id': `${this.seoService.getBaseUrl()}/pricing#webpage`,
            url: `${this.seoService.getBaseUrl()}/pricing`,
            name: 'Pricing Plans for Teams | Workspace Pro',
            description: 'Compare Workspace Pro pricing plans for task management, Kanban boards, team collaboration, calendars, timesheets, and project tracking.',
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: this.seoService.getBaseUrl()
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Pricing',
                  item: `${this.seoService.getBaseUrl()}/pricing`
                }
              ]
            }
          }
        ]
      }
    });
  }

  readonly plans: PricingPlan[] = [
    {
      id: 'trial',
      name: 'Free Trial',
      badge: '1-Month Free Trial',
      description: 'Experience full workspace project management free for 30 days. No credit card required.',
      priceMonthly: 0,
      priceAnnual: 0,
      billingNote: 'Full workspace access for 30 days. No credit card needed.',
      ctaText: 'Start 1-Month Free Trial',
      features: [
        'Standard Kanban Board & Tasks',
        'Built-in Status Workflow (To Do, In Progress, Done)',
        'Task Checklists & Sub-item Tracking',
        'Due Dates, Priority Flags & Tagging',
        'Calendar Schedule & Milestone View',
        'Cloud File Attachments & Documentation'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      badge: 'Most Popular',
      highlighted: true,
      description: 'Full workspace agility with dynamic status pipelines, time tracking, and team productivity.',
      priceMonthly: 19,
      priceAnnual: 15,
      ctaText: 'Get Pro Plan',
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
      description: 'Maximum workspace governance with Kanban drag-and-drop, team collaboration, and custom branding.',
      priceMonthly: 29,
      priceAnnual: 24,
      ctaText: 'Upgrade to Ultra',
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

  toggleBilling(annual: boolean): void {
    this.isAnnual = annual;
  }

  selectPlan(plan: PricingPlan): void {
    this.router.navigate(['/register'], {
      queryParams: {
        plan: plan.id,
        billing: this.isAnnual ? 'annual' : 'monthly'
      }
    });
  }
}
