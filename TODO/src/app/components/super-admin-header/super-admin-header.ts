import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/api/api.config';
import { ROUTE_URL, ROUTES } from '../../core/routing/route-paths';

@Component({
  selector: 'app-super-admin-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './super-admin-header.html',
  styleUrl: './super-admin-header.css'
})
export class SuperAdminHeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = signal(this.auth.getUser());
  protected readonly apiOrigin = API_BASE_URL.replace(/\/api$/, '');
  protected readonly routes = ROUTE_URL;

  protected readonly pageTitle = signal('Super Admin Portal');

  protected readonly userAvatar = computed(() => {
    const u = this.user();
    if (!u?.profileImagePath) return null;
    return u.profileImagePath.startsWith('http') ? u.profileImagePath : `${this.apiOrigin}${u.profileImagePath}`;
  });

  constructor() {
    this.updateTitle(this.router.url);
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.updateTitle((e as NavigationEnd).urlAfterRedirects);
    });
  }

  private updateTitle(url: string): void {
    if (url.includes('/settings')) {
      this.pageTitle.set('Super Admin Settings');
    } else {
      this.pageTitle.set('Company & Tenant Overview');
    }
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
