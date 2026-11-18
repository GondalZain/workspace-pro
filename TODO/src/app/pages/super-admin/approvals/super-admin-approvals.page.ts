import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SuperAdminApiService } from '../../../core/api/super-admin-api.service';
import { NotificationService } from '../../../core/notifications/notification.service';
import { Company, CompanyStats } from '../../../models/company.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyCardComponent } from '../../../components/company-card/company-card';
import { StatCardComponent } from '../../../components/stat-card/stat-card';
import { ROUTES } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-super-admin-approvals-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CompanyCardComponent, StatCardComponent],
  templateUrl: './super-admin-approvals.page.html',
  styleUrl: './super-admin-approvals.page.css'
})
export class SuperAdminApprovalsPageComponent implements OnDestroy {
  private readonly superAdminApi = inject(SuperAdminApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private syncSub: Subscription | null = null;

  protected readonly companies = signal<Company[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly activeTab = signal<'pending' | 'rejected' | 'all'>('pending');

  protected readonly filteredCompanies = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const tab = this.activeTab();
    return this.companies().filter((c) => {
      if (tab === 'pending' && c.status !== 'pending') return false;
      if (tab === 'rejected' && c.status !== 'rejected') return false;
      if (tab === 'all' && (c.status === 'active')) return false; // Show non-working/review items in all
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.domain && c.domain.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        c.admins?.some(a => a.username.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
      );
    });
  });

  protected readonly pendingCount = computed(() => this.companies().filter(c => c.status === 'pending').length);
  protected readonly rejectedCount = computed(() => this.companies().filter(c => c.status === 'rejected').length);

  protected readonly stats = signal<CompanyStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    pendingCompanies: 0,
    totalAdmins: 0,
    totalUsers: 0
  });

  protected readonly isLoading = signal(true);
  protected readonly actionMessage = signal<string | null>(null);

  // Approval Configuration Modal State
  protected readonly isApprovalModalOpen = signal(false);
  protected readonly approvingCompany = signal<Company | null>(null);
  protected readonly configDomain = signal('');
  protected readonly configEmailDomain = signal('');
  protected readonly configTitle = signal('');
  protected readonly configDescription = signal('');
  protected readonly configPrimaryColor = signal('#0f766e');
  protected readonly configSecondaryColor = signal('#ffffff');
  protected readonly modalError = signal<string | null>(null);
  protected readonly isSubmittingApproval = signal(false);

  constructor() {
    this.loadData();
    this.syncSub = this.notificationService.companySync$.subscribe(() => {
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    if (this.syncSub) {
      this.syncSub.unsubscribe();
      this.syncSub = null;
    }
  }

  protected loadData(): void {
    this.isLoading.set(true);
    this.superAdminApi.listCompanies().subscribe({
      next: (res) => {
        this.companies.set(res.companies);
        this.stats.set(res.stats);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.auth.logout();
          this.router.navigateByUrl('/login');
        }
      }
    });
  }

  // Direct rejection or other status updates
  protected onCompanyStatusChange(event: { companyId: number; status: 'active' | 'rejected' | 'suspended' }): void {
    if (event.status === 'active') {
      const company = this.companies().find(c => c.id === event.companyId);
      if (company) {
        this.openApprovalModal(company);
        return;
      }
    }

    // Direct rejection without extra steps
    this.superAdminApi.updateCompanyStatus(event.companyId, event.status).subscribe({
      next: (updated) => {
        this.companies.update(list => list.map(c => c.id === event.companyId ? { ...c, status: updated.status } : c));
        const statusLabel = event.status === 'rejected' ? 'Rejected' : 'Updated';
        this.actionMessage.set(`Workspace registration directly ${statusLabel}.`);
        setTimeout(() => this.actionMessage.set(null), 4000);
        this.loadData();
      },
      error: (err) => {
        alert(err.error?.error || 'Failed to update company status.');
      }
    });
  }

  // Open modal when Super Admin clicks "Accept"
  protected openApprovalModal(company: Company): void {
    this.approvingCompany.set(company);
    const suggestedDomain = company.domain || (company.name ? `${company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.localhost` : '');
    // Email domain is kept empty by default for approved users unless explicitly specified
    const existingEmailDomain = company.emailDomain;
    const isPublicEmail = existingEmailDomain && ['@gmail.com', '@googlemail.com', '@yahoo.com', '@hotmail.com', '@outlook.com'].includes(existingEmailDomain.toLowerCase());
    const initialEmailDomain = isPublicEmail ? '' : (existingEmailDomain || '');

    this.configDomain.set(suggestedDomain);
    this.configEmailDomain.set(initialEmailDomain);
    this.configTitle.set(company.title || '');
    this.configDescription.set(company.description || '');
    this.configPrimaryColor.set(company.primaryColor || '#0f766e');
    this.configSecondaryColor.set(company.secondaryColor || '#ffffff');
    this.modalError.set(null);
    this.isApprovalModalOpen.set(true);
  }

  protected closeApprovalModal(): void {
    this.isApprovalModalOpen.set(false);
    this.approvingCompany.set(null);
    this.modalError.set(null);
  }

  protected onDomainInput(val: string): void {
    const clean = val.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    this.configDomain.set(clean);
  }

  protected onEmailDomainInput(val: string): void {
    let domain = val.trim();
    if (domain && !domain.startsWith('@') && !domain.includes('@')) {
      domain = '@' + domain;
    }
    this.configEmailDomain.set(domain);
  }

  // Confirm Approval with Custom Domain & Company Configuration
  protected submitApproval(): void {
    const target = this.approvingCompany();
    if (!target) return;

    const domain = this.configDomain().trim().toLowerCase();
    if (!domain) {
      this.modalError.set('Custom Domain Access is mandatory. Please provide a workspace hostname/domain.');
      return;
    }

    this.isSubmittingApproval.set(true);
    this.modalError.set(null);

    const emailDomTrimmed = this.configEmailDomain().trim();
    const config = {
      domain,
      emailDomain: emailDomTrimmed ? emailDomTrimmed : null, // Remains empty/null if blank
      title: this.configTitle().trim() || undefined,
      description: this.configDescription().trim() || undefined,
      primaryColor: this.configPrimaryColor() || undefined,
      secondaryColor: this.configSecondaryColor() || undefined
    };

    this.superAdminApi.updateCompanyStatus(target.id, 'active', config).subscribe({
      next: (updated) => {
        this.isSubmittingApproval.set(false);
        this.closeApprovalModal();
        this.companies.update(list => list.map(c => c.id === target.id ? { ...c, ...updated, status: 'active' } : c));
        this.actionMessage.set(`Workspace "${target.name}" approved successfully with domain "${domain}" and activated into Working Companies.`);
        setTimeout(() => this.actionMessage.set(null), 5000);
        this.loadData();
      },
      error: (err) => {
        this.isSubmittingApproval.set(false);
        this.modalError.set(err.error?.error || 'Failed to approve workspace configuration.');
      }
    });
  }
}
