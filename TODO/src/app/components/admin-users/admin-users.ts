import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Role } from '../../core/api/admin-api.service';
import { User } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/api/api.config';
import type { UserProfileChange } from '../admin-user-settings/admin-user-settings';
import { ROUTES } from '../../core/routing/route-paths';
import { SearchFieldComponent } from '../../shared/forms';
export type { UserProfileChange };

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css'
})
export class AdminUsersComponent {
  readonly users = input.required<User[]>();
  readonly roles = input.required<Role[]>();
  protected readonly searchQuery = signal('');

  readonly profileSaved = output<UserProfileChange>();

  private readonly router = inject(Router);

  protected readonly apiOrigin = API_BASE_URL.replace(/\/api$/, '');

  protected readonly filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.users();
    if (!q) return list;
    return list.filter((u) => {
      const roleName = this.getRoleName(u.roleId).toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        roleName.includes(q)
      );
    });
  });

  protected getRoleName(roleId?: number | null): string {
    if (!roleId) return 'Member';
    return this.roles().find((r) => r.id === roleId)?.name || 'Member';
  }

  protected getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  protected getAvatarUrl(path?: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
    return `${this.apiOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  protected editUser(userId: number): void {
    this.router.navigate(ROUTES.adminUserEdit(userId), { state: { userId } });
  }

  protected createAccount(): void {
    this.router.navigate(ROUTES.adminUserCreate);
  }
}
