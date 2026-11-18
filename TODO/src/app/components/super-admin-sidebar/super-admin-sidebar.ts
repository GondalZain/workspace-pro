import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/api/api.config';
import { ROUTE_URL, ROUTES } from '../../core/routing/route-paths';

@Component({
  selector: 'app-super-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './super-admin-sidebar.html',
  styleUrl: './super-admin-sidebar.css'
})
export class SuperAdminSidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = signal(this.auth.getUser());
  protected readonly apiOrigin = API_BASE_URL.replace(/\/api$/, '');
  protected readonly routes = ROUTE_URL;

  protected readonly userAvatar = computed(() => {
    const u = this.user();
    if (!u?.profileImagePath) return null;
    return u.profileImagePath.startsWith('http') ? u.profileImagePath : `${this.apiOrigin}${u.profileImagePath}`;
  });

  protected logout(): void {
    this.auth.logout();
  }
}
