import { Routes } from '@angular/router';
import { adminRoutes } from './core/routing/admin.routes';
import { authRoutes } from './core/routing/auth.routes';
import { APP_PATH } from './core/routing/route-paths';
import { userWorkspaceLegacyRedirects, userWorkspaceRoutes } from './core/routing/user-workspace.routes';
import { superAdminGuard, guestGuard } from './core/auth/auth.guard';
import { LandingComponent } from './components/landing/landing.component';

const superAdminChildren: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/super-admin/dashboard/super-admin-dashboard.page').then((m) => m.SuperAdminDashboardPageComponent)
  },
  {
    path: 'approvals',
    loadComponent: () => import('./pages/super-admin/approvals/super-admin-approvals.page').then((m) => m.SuperAdminApprovalsPageComponent)
  },
  {
    path: 'companies/:id',
    loadComponent: () => import('./pages/super-admin/company-detail/company-detail.page').then((m) => m.CompanyDetailPageComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/super-admin/settings/super-admin-settings.page').then((m) => m.SuperAdminSettingsPageComponent)
  },
  {
    path: 'marketing',
    loadComponent: () => import('./pages/super-admin/marketing/super-admin-marketing.page').then((m) => m.SuperAdminMarketingPageComponent)
  }
];

export const routes: Routes = [
  { path: '', component: LandingComponent, canActivate: [guestGuard] },
  {
    path: 'super-admin',
    canActivate: [superAdminGuard],
    loadComponent: () => import('./pages/super-admin/super-admin-layout').then((m) => m.SuperAdminLayoutComponent),
    children: superAdminChildren
  },
  ...authRoutes,
  ...userWorkspaceRoutes,
  ...userWorkspaceLegacyRedirects,
  ...adminRoutes,
  { path: '**', redirectTo: APP_PATH.fallback }
];
