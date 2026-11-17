import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminApiService, Permission, Role } from '../../../core/api/admin-api.service';
import { AuthService, User } from '../../../core/auth/auth.service';
import { AdminPageHeaderComponent } from '../../../components/admin-page-header/admin-page-header';
import { ROUTE_URL } from '../../../core/routing/route-paths';
import { MetricCardsComponent, MetricCard } from '../../../components/metric-cards/metric-cards';
import { AdminUsersComponent } from '../../../components/admin-users/admin-users';

@Component({
  selector: 'app-admin-overview-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AdminPageHeaderComponent,
    MetricCardsComponent,
    AdminUsersComponent
  ],
  templateUrl: './overview.page.html',
  styleUrl: './overview.page.css'
})
export class AdminOverviewPage {
  protected readonly url = ROUTE_URL;

  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);

  protected readonly currentUser = signal(this.auth.getUser());
  protected readonly headerTitle = computed(() => {
    const comp = this.currentUser()?.company;
    return comp ? `${comp.name} Overview` : 'Company Admin Dashboard';
  });
  protected readonly headerDesc = computed(() => {
    const comp = this.currentUser()?.company;
    return comp?.description || 'System statistics, user directory overview, security roles, and quick workspace access.';
  });

  protected readonly users = signal<User[]>([]);
  protected readonly roles = signal<Role[]>([]);
  protected readonly permissions = signal<Permission[]>([]);
  protected readonly errorMessage = signal('');

  protected readonly metricCards = computed<MetricCard[]>(() => [
    { id: 'users', label: 'Total Users', value: this.users().length, note: 'Registered company accounts' },
    { id: 'roles', label: 'Assigned Roles', value: this.roles().length, note: 'RBAC security levels' },
    { id: 'permissions', label: 'Permissions', value: this.permissions().length, note: 'Granular access rights' },
    { id: 'active', label: 'Admin Access', value: 1, note: 'Active administrator session' }
  ]);

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    this.api.listUsers().subscribe({
      next: (users) => { this.users.set(users); this.errorMessage.set(''); },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load users.')
    });

    this.api.listRoles().subscribe({
      next: (roles) => { this.roles.set(roles); this.errorMessage.set(''); },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load roles.')
    });

    this.api.listPermissions().subscribe({
      next: (permissions) => this.permissions.set(permissions),
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load permissions.')
    });
  }
}
