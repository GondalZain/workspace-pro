import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SuperAdminApiService } from '../../../core/api/super-admin-api.service';
import { AdminApiService, Permission, Role } from '../../../core/api/admin-api.service';
import { Company, CompanyAdmin } from '../../../models/company.model';
import { API_BASE_URL } from '../../../core/api/api.config';
import { ROUTE_URL, ROUTES } from '../../../core/routing/route-paths';
import { CompanyThemeService } from '../../../core/theme/company-theme.service';

import { CompanyHeroHeaderComponent } from '../../../components/company-detail-components/company-hero-header/company-hero-header';
import { CompanyDetailTabBarComponent } from '../../../components/company-detail-components/company-detail-tab-bar/company-detail-tab-bar';
import { CompanyProfileTabComponent } from '../../../components/company-detail-components/company-profile-tab/company-profile-tab';
import { BrandColorsTabComponent } from '../../../components/company-detail-components/brand-colors-tab/brand-colors-tab';
import { CompanyAdminsTabComponent } from '../../../components/company-detail-components/company-admins-tab/company-admins-tab';
import { AdminPermissionsTabComponent } from '../../../components/company-detail-components/admin-permissions-tab/admin-permissions-tab';
import { TenantOverviewTabComponent } from '../../../components/company-detail-components/tenant-overview-tab/tenant-overview-tab';

import { CompanyStatusesTabComponent } from '../../../components/company-detail-components/company-statuses-tab/company-statuses-tab';

@Component({
  selector: 'app-company-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CompanyHeroHeaderComponent,
    CompanyDetailTabBarComponent,
    CompanyProfileTabComponent,
    BrandColorsTabComponent,
    CompanyAdminsTabComponent,
    AdminPermissionsTabComponent,
    CompanyStatusesTabComponent,
    TenantOverviewTabComponent
  ],
  templateUrl: './company-detail.page.html',
  styleUrl: './company-detail.page.css'
})
export class CompanyDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly superAdminApi = inject(SuperAdminApiService);
  private readonly adminApi = inject(AdminApiService);
  private readonly themeService = inject(CompanyThemeService);

  protected readonly apiOrigin = API_BASE_URL.replace(/\/api$/, '');
  protected readonly routes = ROUTE_URL;

  protected readonly company = signal<Company | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly activeTab = signal<'profile' | 'colors' | 'admins' | 'permissions' | 'statuses' | 'metrics'>('profile');

  // Permissions & Roles Management
  protected readonly adminRole = signal<Role | null>(null);
  protected readonly allRoles = signal<Role[]>([]);
  protected readonly availablePermissions = signal<Permission[]>([
    { id: 1, name: 'users.manage', description: 'Manage & register company user accounts and assign roles' },
    { id: 2, name: 'tasks.create', description: 'Create new tasks within the workspace' },
    { id: 3, name: 'tasks.edit', description: 'Edit task details, status, and assignees' },
    { id: 4, name: 'tasks.delete', description: 'Delete company tasks' },
    { id: 5, name: 'projects.manage', description: 'Create, update, and manage company projects' },
    { id: 6, name: 'timesheets.manage', description: 'Log, edit, and manage timesheets' }
  ]);
  protected readonly selectedPermissions = signal<Set<string>>(
    new Set(['users.manage', 'tasks.create', 'tasks.edit', 'tasks.delete', 'projects.manage', 'timesheets.manage'])
  );
  protected readonly isSavingPermissions = signal(false);
  protected readonly permissionSuccess = signal<string | null>(null);

  // Custom Role Creation Form Signals
  protected newRoleName = signal('');
  protected newRoleDescription = signal('');
  protected newRolePermissions = signal<Set<string>>(new Set());
  protected isCreatingRole = signal(false);
  protected roleSuccess = signal<string | null>(null);
  protected roleError = signal<string | null>(null);

  // Form Fields
  protected companyName = signal('');
  protected title = signal('');
  protected description = signal('');
  protected emailDomain = signal('');
  protected domain = signal('');
  protected status = signal<'active' | 'suspended' | 'pending' | 'rejected'>('active');
  protected primaryColor = signal('#0f766e');
  protected secondaryColor = signal('#ffffff');
  protected logoFile = signal<File | null>(null);
  protected logoPreview = signal<string | null>(null);
  protected removeLogo = signal(false);

  // Preset Palettes
  protected readonly presetColors = [
    { name: 'Teal', primary: '#0f766e', secondary: '#ffffff' },
    { name: 'Indigo', primary: '#4f46e5', secondary: '#ffffff' },
    { name: 'Royal Blue', primary: '#2563eb', secondary: '#ffffff' },
    { name: 'Emerald', primary: '#059669', secondary: '#ffffff' },
    { name: 'Amber', primary: '#d97706', secondary: '#ffffff' },
    { name: 'Crimson', primary: '#e11d48', secondary: '#ffffff' },
    { name: 'Purple', primary: '#7c3aed', secondary: '#ffffff' },
    { name: 'Slate Dark', primary: '#0f172a', secondary: '#1e293b' }
  ];

  // New & Edit Admin Fields
  protected newAdminUsername = signal('');
  protected newAdminEmail = signal('');
  protected newAdminOriginalEmail = signal('');
  protected newAdminPassword = signal('');
  protected selectedRoleIdForNewAdmin = signal<number | null>(null);
  protected adminError = signal<string | null>(null);
  protected isAddingAdmin = signal(false);
  protected isSavingAdminEdit = signal(false);
  protected editAdminError = signal<string | null>(null);

  // Status Banners
  protected isSaving = signal(false);
  protected successMessage = signal<string | null>(null);
  protected errorMessage = signal<string | null>(null);
  private successTimeout: any = null;

  protected setSuccess(msg: string): void {
    this.successMessage.set(msg);
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
    this.successTimeout = setTimeout(() => {
      this.successMessage.set(null);
    }, 4000);
  }

  protected switchTab(tab: 'profile' | 'colors' | 'admins' | 'permissions' | 'statuses' | 'metrics'): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.activeTab.set(tab);
  }

  protected readonly currentLogoUrl = computed(() => {
    if (this.logoPreview()) return this.logoPreview();
    if (this.removeLogo()) return null;
    const path = this.company()?.logoPath;
    if (!path) return null;
    return path.startsWith('http') ? path : `${this.apiOrigin}${path}`;
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (isNaN(id)) {
      this.router.navigate([ROUTE_URL.superAdminDashboard]);
      return;
    }
    this.loadCompany(id);
    this.loadPermissions();
  }

  protected loadCompany(id: number, silent: boolean = false): void {
    if (!silent) {
      this.isLoading.set(true);
    }
    this.superAdminApi.getCompanyById(id).subscribe({
      next: (comp) => {
        this.company.set(comp);
        this.companyName.set(comp.name);
        this.title.set(comp.title || '');
        this.description.set(comp.description || '');
        this.emailDomain.set(comp.emailDomain || '');
        this.domain.set(comp.domain || '');
        this.status.set(comp.status);
        this.primaryColor.set(comp.primaryColor || '#0f766e');
        this.secondaryColor.set(comp.secondaryColor || '#ffffff');
        if (!silent) {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load company details:', err);
        if (!silent) {
          this.isLoading.set(false);
          this.errorMessage.set('Company not found or failed to load.');
        }
      }
    });
  }

  protected loadPermissions(): void {
    this.adminApi.listPermissions().subscribe({
      next: (perms) => {
        if (perms && perms.length > 0) {
          this.availablePermissions.set(perms);
        }
      },
      error: (err) => console.warn('Could not load permissions list', err)
    });

    this.adminApi.listRoles().subscribe({
      next: (roles) => {
        this.allRoles.set(roles);
        const adminRole = roles.find((r) => r.name === 'admin');
        if (adminRole) {
          this.adminRole.set(adminRole);
          if (adminRole.permissions && adminRole.permissions.length > 0) {
            this.selectedPermissions.set(new Set(adminRole.permissions));
          }
          if (!this.selectedRoleIdForNewAdmin()) {
            this.selectedRoleIdForNewAdmin.set(adminRole.id);
          }
        } else if (roles.length > 0 && !this.selectedRoleIdForNewAdmin()) {
          this.selectedRoleIdForNewAdmin.set(roles[0].id);
        }
      },
      error: (err) => console.warn('Could not load roles list', err)
    });
  }

  protected togglePermission(permissionName: string): void {
    const current = new Set(this.selectedPermissions());
    if (current.has(permissionName)) {
      current.delete(permissionName);
    } else {
      current.add(permissionName);
    }
    this.selectedPermissions.set(current);
  }

  protected hasPermission(permissionName: string): boolean {
    return this.selectedPermissions().has(permissionName);
  }

  protected toggleNewRolePermission(permissionName: string): void {
    const current = new Set(this.newRolePermissions());
    if (current.has(permissionName)) {
      current.delete(permissionName);
    } else {
      current.add(permissionName);
    }
    this.newRolePermissions.set(current);
  }

  protected hasNewRolePermission(permissionName: string): boolean {
    return this.newRolePermissions().has(permissionName);
  }

  protected editingRoleId = signal<number | null>(null);

  protected editRole(role: Role): void {
    this.editingRoleId.set(role.id);
    this.newRoleName.set(role.name);
    this.newRoleDescription.set(role.description || '');
    this.newRolePermissions.set(new Set(role.permissions || []));
    this.roleError.set(null);
    this.roleSuccess.set(null);
  }

  protected resetRoleForm(): void {
    this.editingRoleId.set(null);
    this.newRoleName.set('');
    this.newRoleDescription.set('');
    this.newRolePermissions.set(new Set());
    this.roleError.set(null);
    this.roleSuccess.set(null);
  }

  protected saveRole(): void {
    const name = this.newRoleName().trim();
    const description = this.newRoleDescription().trim();
    const permissions = Array.from(this.newRolePermissions());

    if (!name) {
      this.roleError.set('Role Name is required.');
      return;
    }

    this.isCreatingRole.set(true);
    this.roleError.set(null);
    this.roleSuccess.set(null);

    const editId = this.editingRoleId();
    if (editId) {
      this.adminApi.updateRole(editId, name, description, permissions).subscribe({
        next: (updatedRole) => {
          this.isCreatingRole.set(false);
          this.roleSuccess.set(`Role "${updatedRole.name}" updated successfully!`);
          this.resetRoleForm();
          this.loadPermissions();
        },
        error: (err) => {
          this.isCreatingRole.set(false);
          this.roleError.set(err.error?.error || 'Failed to update role.');
        }
      });
    } else {
      this.adminApi.createRole(name, description, permissions).subscribe({
        next: (createdRole) => {
          this.isCreatingRole.set(false);
          this.roleSuccess.set(`Role "${createdRole.name}" created successfully!`);
          this.resetRoleForm();
          this.loadPermissions();
        },
        error: (err) => {
          this.isCreatingRole.set(false);
          this.roleError.set(err.error?.error || 'Failed to create custom role.');
        }
      });
    }
  }

  protected deleteRole(role: Role): void {
    if (['super_admin', 'admin', 'user'].includes(role.name)) {
      alert(`The built-in system role '${role.name}' cannot be deleted.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    this.adminApi.deleteRole(role.id).subscribe({
      next: () => {
        this.roleSuccess.set(`Role "${role.name}" deleted.`);
        this.loadPermissions();
      },
      error: (err) => {
        this.roleError.set(err.error?.error || 'Failed to delete role.');
      }
    });
  }

  protected changeAdminRole(admin: CompanyAdmin, targetRoleIdStr: string): void {
    const comp = this.company();
    if (!comp) return;

    const roleId = Number(targetRoleIdStr);
    if (isNaN(roleId)) return;

    // Optimistic local update for instant, smooth UI response without unmounting
    if (comp.admins) {
      const updatedAdmins = comp.admins.map((a) => (a.id === admin.id ? { ...a, roleId } : a));
      this.company.set({ ...comp, admins: updatedAdmins });
    }

    this.superAdminApi.updateCompanyAdminRole(comp.id, admin.id, roleId).subscribe({
      next: () => {
        this.setSuccess(`Role updated for ${admin.username}.`);
        this.loadCompany(comp.id, true);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Failed to update admin role.');
        this.loadCompany(comp.id, true);
      }
    });
  }

  protected saveAdminPermissions(): void {
    const role = this.adminRole();
    if (!role) return;

    this.isSavingPermissions.set(true);
    this.permissionSuccess.set(null);
    this.errorMessage.set(null);

    const updatedPermissions = Array.from(this.selectedPermissions());
    this.adminApi.updateRole(role.id, role.name, role.description, updatedPermissions).subscribe({
      next: (updatedRole) => {
        this.adminRole.set(updatedRole);
        this.selectedPermissions.set(new Set(updatedRole.permissions));
        this.isSavingPermissions.set(false);
        this.permissionSuccess.set('Admin action permissions updated successfully!');
      },
      error: (err) => {
        this.isSavingPermissions.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to update admin permissions.');
      }
    });
  }

  protected setPresetColors(prim: string, sec: string): void {
    this.primaryColor.set(prim);
    this.secondaryColor.set(sec);
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

  protected saveCompanyDetails(): void {
    const comp = this.company();
    if (!comp) return;

    if (!this.companyName().trim()) {
      this.errorMessage.set('Company Name is required.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formData = new FormData();
    formData.append('name', this.companyName().trim());
    formData.append('title', this.title().trim());
    formData.append('description', this.description().trim());
    formData.append('emailDomain', this.emailDomain().trim());
    formData.append('domain', this.domain().trim());
    formData.append('status', this.status());
    formData.append('primaryColor', this.primaryColor());
    formData.append('secondaryColor', this.secondaryColor());

    if (this.removeLogo()) {
      formData.append('removeLogo', 'true');
    } else if (this.logoFile()) {
      formData.append('logo', this.logoFile()!);
    }

    this.superAdminApi.updateCompany(comp.id, formData).subscribe({
      next: (updated) => {
        this.company.set(updated);
        this.isSaving.set(false);
        this.logoFile.set(null);
        this.logoPreview.set(null);
        this.removeLogo.set(false);
        this.setSuccess('Company details & color scheme updated successfully!');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to update company details.');
      }
    });
  }

  protected submitAddAdmin(): void {
    const comp = this.company();
    if (!comp) return;

    const un = this.newAdminUsername().trim();
    const em = this.newAdminEmail().trim();
    const pass = this.newAdminPassword();
    const roleId = this.selectedRoleIdForNewAdmin() ? Number(this.selectedRoleIdForNewAdmin()) : undefined;

    if (!un || !em || !pass) {
      this.adminError.set('Username, Email, and Password are required.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(em)) {
      this.adminError.set('A valid admin email address is required (e.g. admin@company.com).');
      return;
    }

    if (pass.length < 8) {
      this.adminError.set('Admin password must be at least 8 characters long.');
      return;
    }

    this.isAddingAdmin.set(true);
    this.adminError.set(null);

    const origEm = this.newAdminOriginalEmail().trim() || undefined;
    this.superAdminApi.addCompanyAdmin(comp.id, { username: un, email: em, originalEmail: origEm, password: pass, roleId }).subscribe({
      next: () => {
        this.isAddingAdmin.set(false);
        this.newAdminUsername.set('');
        this.newAdminEmail.set('');
        this.newAdminOriginalEmail.set('');
        this.newAdminPassword.set('');
        this.setSuccess(`Admin account created for ${un}.`);
        this.loadCompany(comp.id, true);
      },
      error: (err) => {
        this.isAddingAdmin.set(false);
        this.adminError.set(err.error?.error || err.error?.message || err.message || 'Failed to add admin account.');
      }
    });
  }

  protected submitEditAdmin(event: { adminId: number; username: string; email: string; originalEmail?: string; password?: string; roleId?: number }): void {
    const comp = this.company();
    if (!comp) return;

    this.isSavingAdminEdit.set(true);
    this.editAdminError.set(null);

    this.superAdminApi.updateCompanyAdmin(comp.id, event.adminId, {
      username: event.username,
      email: event.email,
      originalEmail: event.originalEmail,
      password: event.password,
      roleId: event.roleId
    }).subscribe({
      next: (res) => {
        this.isSavingAdminEdit.set(false);
        this.setSuccess(`Admin account details for "${event.username}" updated successfully.`);
        this.loadCompany(comp.id, true);
      },
      error: (err) => {
        this.isSavingAdminEdit.set(false);
        this.editAdminError.set(err.error?.error || err.error?.message || err.message || 'Failed to update admin account details.');
      }
    });
  }

  protected removeAdmin(admin: CompanyAdmin): void {
    const comp = this.company();
    if (!comp) return;

    if (!confirm(`Are you sure you want to remove admin account "${admin.username}" (${admin.email})?`)) {
      return;
    }

    this.superAdminApi.deleteCompanyAdmin(comp.id, admin.id).subscribe({
      next: () => {
        this.setSuccess(`Admin account ${admin.username} removed.`);
        this.loadCompany(comp.id, true);
      },
      error: (err) => {
        this.adminError.set(err.error?.error || 'Failed to remove admin account.');
      }
    });
  }

  protected deleteCompany(): void {
    const comp = this.company();
    if (!comp) return;

    if (!confirm(`Are you sure you want to permanently delete "${comp.name}"? All associated data will be removed.`)) {
      return;
    }

    this.superAdminApi.deleteCompany(comp.id).subscribe({
      next: () => this.router.navigate([ROUTE_URL.superAdminDashboard]),
      error: (err) => alert(err.error?.error || 'Failed to delete company.')
    });
  }
}
