import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ROUTES } from '../routing/route-paths';

function hasSession(): boolean {
  const auth = inject(AuthService);
  return Boolean(auth.getToken() && auth.getUser());
}

import { isSuperAdminHost, isCustomDomainHost } from '../utils/domain.utils';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken('user');
  const user = auth.getUser('user');
  if (!token || !user) {
    const queryParams: Record<string, string> = { returnUrl: state.url };
    const compParam = route.queryParamMap.get('company');
    if (compParam) queryParams['company'] = compParam;
    return router.createUrlTree(ROUTES.login, { queryParams });
  }
  return true;
};

export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken('superadmin');
  const user = auth.getUser('superadmin');

  if (!token || user?.role !== 'super_admin') {
    return router.createUrlTree(ROUTES.login);
  }
  return true;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // If on ANY Company domain / subdomain or Super Admin domain:
  if (isCustomDomainHost()) {
    if (hasSession()) {
      return router.createUrlTree(auth.getHomeRoute(auth.getUser()));
    }
    return router.createUrlTree(ROUTES.login);
  }

  // Bare root platform (default localhost or root cloud site): allow landing page
  return true;
};

export const loginGuard: CanActivateFn = () => {
  // Always permit opening the login portal directly so users can switch accounts or view login cleanly
  return true;
};

export const dashboardGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getUser();
  if (user?.role === 'super_admin') {
    return router.createUrlTree(['/super-admin/dashboard']);
  }
  return true;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getUser();
  if (user?.role === 'super_admin') {
    return router.createUrlTree(['/super-admin/dashboard']);
  }
  return auth.isAdminUser(user)
    ? true
    : router.createUrlTree(ROUTES.dashboardProjects);
};
