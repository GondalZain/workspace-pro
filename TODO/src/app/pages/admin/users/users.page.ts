import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdminApiService, Role } from '../../../core/api/admin-api.service';
import { User } from '../../../core/auth/auth.service';
import { AdminPageHeaderComponent } from '../../../components/admin-page-header/admin-page-header';
import { AdminUsersComponent } from '../../../components/admin-users/admin-users';

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [
    RouterModule,
    AdminPageHeaderComponent,
    AdminUsersComponent
  ],
  templateUrl: './users.page.html',
  styleUrl: './users.page.css'
})
export class AdminUsersPage {
  private readonly api = inject(AdminApiService);

  protected readonly users = signal<User[]>([]);
  protected readonly roles = signal<Role[]>([]);
  protected readonly errorMessage = signal('');

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    this.api.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.errorMessage.set('');
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load users.')
    });

    this.api.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load roles.')
    });
  }
}
