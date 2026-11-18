import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SuperAdminApiService } from '../../../core/api/super-admin-api.service';
import { NotificationService } from '../../../core/notifications/notification.service';
import { Company, CompanyAdmin, CompanyStats } from '../../../models/company.model';
import { API_BASE_URL } from '../../../core/api/api.config';
import { AuthService } from '../../../core/auth/auth.service';
import { ROUTES } from '../../../core/routing/route-paths';

import { CompanyCardComponent } from '../../../components/company-card/company-card';
import { StatCardComponent } from '../../../components/stat-card/stat-card';

@Component({
  selector: 'app-super-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CompanyCardComponent, StatCardComponent],
  templateUrl: './super-admin-dashboard.page.html',
  styleUrl: './super-admin-dashboard.page.css'
})
export class SuperAdminDashboardPageComponent implements OnDestroy {
  private readonly superAdminApi = inject(SuperAdminApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private syncSub: Subscription | null = null;

  protected readonly companies = signal<Company[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal<'all' | 'pending' | 'active' | 'suspended' | 'rejected'>('all');

  // On this main page, show ONLY working (active) companies
  protected readonly filteredCompanies = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    // Working companies only (status === 'active')
    return this.companies().filter((c) => {
      if (c.status !== 'active') return false;
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

  protected readonly stats = signal<CompanyStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    pendingCompanies: 0,
    totalAdmins: 0,
    totalUsers: 0
  });

  protected readonly isLoading = signal(true);
  
  // Create / Edit Company Modal State
  protected readonly isModalOpen = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly editingCompanyId = signal<number | null>(null);

  // Manage Admins Modal State
  protected readonly isAdminModalOpen = signal(false);
  protected readonly selectedCompany = signal<Company | null>(null);
  protected readonly newAdminUsername = signal('');
  protected readonly newAdminEmail = signal('');
  protected readonly newAdminPassword = signal('');
  protected readonly adminModalError = signal<string | null>(null);
  protected readonly isAddingAdmin = signal(false);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // Company Form Fields
  protected companyName = signal('');
  protected title = signal('');
  protected description = signal('');
  protected emailDomain = signal('');
  protected domain = signal('');
  protected status = signal<'active' | 'suspended' | 'pending' | 'rejected'>('active');
  protected primaryColor = signal('#0f766e');
  protected secondaryColor = signal('#ffffff');
  protected adminUsername = signal('');
  protected adminEmail = signal('');
  protected adminOriginalEmail = signal('');
  protected adminPassword = signal('');
  protected logoFile = signal<File | null>(null);
  protected logoPreview = signal<string | null>(null);
  protected removeLogo = signal(false);

  private readonly uploadBaseUrl = API_BASE_URL.replace(/\/api$/, '');

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

  protected onCompanyNameChange(val: string): void {
    this.companyName.set(val);
    if (!this.isEditMode()) {
      const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '');
      const domain = slug ? `@${slug}.com` : '';
      this.emailDomain.set(domain);
      this.domain.set(slug ? `${slug}.com` : '');
      this.updateAutoAdminEmail();
    }
  }

  protected onEmailDomainChange(val: string): void {
    let domain = val.trim();
    if (domain && !domain.startsWith('@') && domain.length > 0 && !domain.includes('@')) {
      domain = '@' + domain;
    }
    this.emailDomain.set(domain);
    this.updateAutoAdminEmail();
  }

  protected onAdminUsernameChange(val: string): void {
    this.adminUsername.set(val);
    this.updateAutoAdminEmail();
  }

  private updateAutoAdminEmail(): void {
    if (this.isEditMode()) return;
    const username = this.adminUsername().trim().toLowerCase().replace(/\s+/g, '.');
    const domain = this.emailDomain().trim();
    if (username && domain) {
      const dom = domain.startsWith('@') ? domain : `@${domain}`;
      this.adminEmail.set(`${username}${dom}`);
    } else if (username) {
      this.adminEmail.set(username);
    }
  }

  protected loadData(): void {
    this.isLoading.set(true);
    this.superAdminApi.listCompanies().subscribe({
      next: (res) => {
        this.companies.set(res.companies);
        this.stats.set(res.stats);
        this.isLoading.set(false);

        // Keep selected company in sync if admin modal is open
        if (this.selectedCompany()) {
          const updated = res.companies.find(c => c.id === this.selectedCompany()!.id);
          if (updated) this.selectedCompany.set(updated);
        }
      },
      error: (err) => {
        console.error('Failed to load companies:', err);
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.auth.logout();
        } else {
          this.errorMessage.set('Failed to connect to backend server. Make sure port 5000 is active.');
        }
      }
    });
  }

  protected logoUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/')) return `${this.uploadBaseUrl}${path}`;
    return `${this.uploadBaseUrl}/${path}`;
  }

  protected onCompanyStatusChange(event: { companyId: number; status: 'active' | 'rejected' | 'suspended' }): void {
    this.superAdminApi.updateCompanyStatus(event.companyId, event.status).subscribe({
      next: (updated) => {
        // Update local state
        this.companies.update(list => list.map(c => c.id === event.companyId ? { ...c, status: updated.status } : c));
        // Refresh full counts
        this.loadData();
      },
      error: (err) => {
        alert(err.error?.error || 'Failed to update company status.');
      }
    });
  }

  // --- Company Modal Actions ---
  protected openCreateModal(): void {
    this.resetForm();
    this.isEditMode.set(false);
    this.editingCompanyId.set(null);
    this.isModalOpen.set(true);
  }

  protected openEditModal(company: Company): void {
    this.resetForm();
    this.isEditMode.set(true);
    this.editingCompanyId.set(company.id);

    this.companyName.set(company.name);
    this.title.set(company.title || '');
    this.description.set(company.description || '');
    this.emailDomain.set(company.emailDomain || '');
    this.domain.set(company.domain || '');
    this.status.set(company.status);
    this.adminUsername.set(company.adminUsername);
    this.adminEmail.set(company.adminEmail);

    if (company.logoPath) {
      this.logoPreview.set(this.logoUrl(company.logoPath));
    }

    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.logoFile.set(file);
      this.removeLogo.set(false);

      const reader = new FileReader();
      reader.onload = (e) => this.logoPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  protected clearLogo(): void {
    this.logoFile.set(null);
    this.logoPreview.set(null);
    this.removeLogo.set(true);
  }

  protected resetForm(): void {
    this.companyName.set('');
    this.title.set('');
    this.description.set('');
    this.emailDomain.set('');
    this.domain.set('');
    this.status.set('active');
    this.adminUsername.set('');
    this.adminEmail.set('');
    this.adminOriginalEmail.set('');
    this.adminPassword.set('');
    this.logoFile.set(null);
    this.logoPreview.set(null);
    this.removeLogo.set(false);
    this.errorMessage.set(null);
  }

  protected submitCompanyForm(): void {
    if (!this.companyName()) {
      this.errorMessage.set('Company Name is required.');
      return;
    }

    if (!this.isEditMode()) {
      const email = this.adminEmail().trim();
      if (!this.adminUsername() || !email || !this.adminPassword()) {
        this.errorMessage.set('Initial admin credentials (username, email, password) are required.');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        this.errorMessage.set('A valid admin email address is required (e.g. admin@company.com).');
        return;
      }
      if (this.adminPassword().length < 8) {
        this.errorMessage.set('Admin password must be at least 8 characters long.');
        return;
      }
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formData = new FormData();
    formData.append('name', this.companyName());
    formData.append('title', this.title());
    formData.append('description', this.description());
    formData.append('status', this.status());
    formData.append('primaryColor', this.primaryColor());
    formData.append('secondaryColor', this.secondaryColor());
    formData.append('emailDomain', this.emailDomain());
    formData.append('domain', this.domain());

    if (this.removeLogo()) {
      formData.append('removeLogo', 'true');
    } else if (this.logoFile()) {
      formData.append('logo', this.logoFile()!);
    }

    if (this.isEditMode() && this.editingCompanyId()) {
      this.superAdminApi.updateCompany(this.editingCompanyId()!, formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.error || err.error?.message || err.message || 'Failed to update company.');
        }
      });
    } else {
      formData.append('companyName', this.companyName());
      formData.append('adminUsername', this.adminUsername());
      formData.append('adminEmail', this.adminEmail().trim());
      if (this.adminOriginalEmail().trim()) {
        formData.append('adminOriginalEmail', this.adminOriginalEmail().trim());
      }
      formData.append('adminPassword', this.adminPassword());

      this.superAdminApi.createCompany(formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.error || err.error?.message || err.message || 'Failed to create company & admin account.');
        }
      });
    }
  }

  protected deleteCompany(id: number, name: string): void {
    if (!confirm(`Are you sure you want to delete "${name}"? All associated users and data will be permanently removed.`)) {
      return;
    }

    this.superAdminApi.deleteCompany(id).subscribe({
      next: () => this.loadData(),
      error: (err) => alert(err.error?.error || 'Failed to delete company.')
    });
  }

  // --- Company Admin Management Modal ---
  protected openAdminModal(company: Company): void {
    this.selectedCompany.set(company);
    this.newAdminUsername.set('');
    this.newAdminEmail.set('');
    this.newAdminPassword.set('');
    this.adminModalError.set(null);
    this.isAdminModalOpen.set(true);
  }

  protected closeAdminModal(): void {
    this.isAdminModalOpen.set(false);
    this.selectedCompany.set(null);
    this.adminModalError.set(null);
  }

  protected submitAddCompanyAdmin(): void {
    const company = this.selectedCompany();
    if (!company) return;

    const username = this.newAdminUsername().trim();
    const email = this.newAdminEmail().trim();
    const password = this.newAdminPassword();

    if (!username || !email || !password) {
      this.adminModalError.set('Admin username, email, and password are required.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      this.adminModalError.set('A valid admin email address is required (e.g. admin@company.com).');
      return;
    }

    if (password.length < 8) {
      this.adminModalError.set('Admin password must be at least 8 characters long.');
      return;
    }

    this.isAddingAdmin.set(true);
    this.adminModalError.set(null);

    this.superAdminApi.addCompanyAdmin(company.id, { username, email, password }).subscribe({
      next: (res) => {
        this.isAddingAdmin.set(false);
        this.newAdminUsername.set('');
        this.newAdminEmail.set('');
        this.newAdminPassword.set('');
        this.loadData();
      },
      error: (err) => {
        this.isAddingAdmin.set(false);
        this.adminModalError.set(err.error?.error || err.error?.message || err.message || 'Failed to add admin account.');
      }
    });
  }

  protected removeCompanyAdmin(admin: CompanyAdmin): void {
    const company = this.selectedCompany();
    if (!company) return;

    if (!confirm(`Are you sure you want to remove admin account "${admin.username}" (${admin.email})?`)) {
      return;
    }

    this.superAdminApi.deleteCompanyAdmin(company.id, admin.id).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        this.adminModalError.set(err.error?.error || 'Failed to remove admin account.');
      }
    });
  }
}
