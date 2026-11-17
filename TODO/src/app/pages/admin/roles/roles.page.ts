import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminApiService, Permission, Role } from '../../../core/api/admin-api.service';
import { AdminPageHeaderComponent } from '../../../components/admin-page-header/admin-page-header';
import { ROUTE_URL } from '../../../core/routing/route-paths';
import { AdminRolesComponent, RoleChange } from '../../../components/admin-roles/admin-roles';

@Component({
  selector: 'app-admin-roles-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AdminPageHeaderComponent,
    AdminRolesComponent
  ],
  templateUrl: './roles.page.html',
  styleUrl: './roles.page.css'
})
export class AdminRolesPage {
  protected readonly url = ROUTE_URL;

  private readonly api = inject(AdminApiService);

  protected readonly roles = signal<Role[]>([]);
  protected readonly permissions = signal<Permission[]>([]);
  protected readonly errorMessage = signal('');

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    this.api.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.errorMessage.set('');
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load roles.')
    });

    this.api.listPermissions().subscribe({
      next: (permissions) => {
        this.permissions.set(permissions);
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load permissions.')
    });
  }

  protected saveRole(change: RoleChange): void {
    this.api.updateRole(change.roleId, change.name, change.description, change.permissions).subscribe({
      next: (role) => {
        this.roles.update((roles) => roles.map((r) => r.id === role.id ? role : r));
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not update role.')
    });
  }

  protected deleteRole(roleId: number): void {
    this.api.deleteRole(roleId).subscribe({
      next: () => {
        this.roles.update((roles) => roles.filter((r) => r.id !== roleId));
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not delete role.')
    });
  }
}
