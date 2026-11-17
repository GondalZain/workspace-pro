import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AdminApiService, Role } from '../../../core/api/admin-api.service';
import { User } from '../../../core/auth/auth.service';
import { AdminPageHeaderComponent } from '../../../components/admin-page-header/admin-page-header';
import { ROUTES, ROUTE_URL } from '../../../core/routing/route-paths';
import { AdminUserSettingsComponent, UserProfileChange } from '../../../components/admin-user-settings/admin-user-settings';

@Component({
  selector: 'app-admin-user-edit-page',
  standalone: true,
  imports: [
    RouterModule,
    AdminPageHeaderComponent,
    AdminUserSettingsComponent
  ],
  templateUrl: './user-edit.page.html',
  styleUrl: './user-edit.page.css'
})
export class AdminUserEditPage implements OnInit {
  protected readonly url = ROUTE_URL;

  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly user = signal<User | null>(null);
  protected readonly roles = signal<Role[]>([]);
  protected readonly errorMessage = signal('');
  protected readonly isSaving = signal(false);

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    const stateId = history.state?.userId;
    const rawId = routeId || stateId;
    const userId = rawId ? Number(rawId) : NaN;

    if (!userId || isNaN(userId)) {
      this.router.navigate(ROUTES.adminUsers);
      return;
    }
    this.loadData(userId);
  }

  private loadData(userId: number): void {
    this.api.listRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load roles.')
    });

    this.api.getUserById(userId).subscribe({
      next: (user) => {
        this.user.set(user);
        this.errorMessage.set('');
      },
      error: (err) => this.errorMessage.set(err.error?.error || `User #${userId} not found.`)
    });
  }

  protected saveUser(change: UserProfileChange): void {
    this.isSaving.set(true);
    this.errorMessage.set('');

    this.api.updateUser(
      change.userId,
      change.username,
      change.email,
      undefined,
      change.profileImage
    ).subscribe({
      next: () => {
        this.api.setRole(change.userId, change.roleId).subscribe({
          next: () => {
            this.isSaving.set(false);
            this.router.navigate(ROUTES.adminUsers);
          },
          error: (err) => {
            this.isSaving.set(false);
            this.errorMessage.set(err.error?.error || 'Could not update user role.');
          }
        });
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.error || 'Could not update user profile.');
      }
    });
  }

  protected goBack(): void {
    this.router.navigate(ROUTES.adminUsers);
  }
}
