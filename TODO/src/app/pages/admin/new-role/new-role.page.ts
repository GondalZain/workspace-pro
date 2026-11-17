import { Component, inject, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AdminApiService, Permission, Role } from '../../../core/api/admin-api.service';
import { AdminPageHeaderComponent } from '../../../components/admin-page-header/admin-page-header';
import { ROUTES, ROUTE_URL } from '../../../core/routing/route-paths';
import { AdminRolesComponent, RoleChange } from '../../../components/admin-roles/admin-roles';

@Component({
  selector: 'app-admin-new-role-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AdminPageHeaderComponent,
    AdminRolesComponent
  ],
  templateUrl: './new-role.page.html',
  styleUrl: './new-role.page.css'
})
export class AdminNewRolePage {
  protected readonly url = ROUTE_URL;

  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);

  protected readonly roles = signal<Role[]>([]);
  protected readonly permissions = signal<Permission[]>([]);
  protected readonly errorMessage = signal('');
  protected readonly showCreateForm = model(true);

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    this.api.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load roles.')
    });

    this.api.listPermissions().subscribe({
      next: (permissions) => {
        this.permissions.set(permissions);
        this.errorMessage.set('');
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load permissions.')
    });
  }

  protected createRole(change: RoleChange): void {
    this.api.createRole(change.name, change.description, change.permissions).subscribe({
      next: () => {
        this.router.navigate(ROUTES.adminRoles);
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not create role.')
    });
  }
}
