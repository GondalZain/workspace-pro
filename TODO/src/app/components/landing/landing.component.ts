import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CompanyThemeService } from '../../core/theme/company-theme.service';
import { PublicNavbarComponent } from '../public-navbar/public-navbar.component';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, PublicNavbarComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
  private readonly companyTheme = inject(CompanyThemeService);
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    // Enforce fixed platform color scheme on landing page
    this.companyTheme.resetDefaultTheme();

    // SEO Optimization for Home Page
    this.seoService.setPageSeo({
      title: 'Workspace Pro – Task & Project Management Software',
      description: 'Manage team tasks, project deadlines, Kanban boards, and workflows with Workspace Pro. Organize work, track progress, and keep your team aligned.',
      canonicalPath: '/',
      ogType: 'website',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${this.seoService.getBaseUrl()}/#website`,
            url: this.seoService.getBaseUrl(),
            name: 'Workspace Pro',
            description: 'Enterprise task and project management software for modern high-performing teams.',
            inLanguage: 'en-US'
          },
          {
            '@type': 'SoftwareApplication',
            '@id': `${this.seoService.getBaseUrl()}/#software`,
            name: 'Workspace Pro',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'All',
            url: this.seoService.getBaseUrl(),
            description: 'Enterprise task and project management platform with dynamic task statuses, Kanban boards, sprint calendars, timesheets, and team workspaces.',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: '30-Day Free Trial with full workspace project management access.'
            }
          }
        ]
      }
    });
  }
}

