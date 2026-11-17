import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ROUTES } from '../routing/route-paths';

function hasSession(): boolean {
  const auth = inject(AuthService);
  return Boolean(auth.getToken() && auth.getUser());
}

import { isSuperAdminHost, isCustomDomainHost } from '../utils/domain.utils';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!hasSession()) {
    return isCustomDomainHost()
      ? router.createUrlTree(ROUTES.login)
      : router.createUrlTree(['/']);
  }
  const user = auth.getUser();
  if (user?.role === 'super_admin') {
    return router.createUrlTree(['/super-admin/dashboard']);
  }
  return true;
};

export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!hasSession()) {
    return isCustomDomainHost()
      ? router.createUrlTree(ROUTES.login)
      : router.createUrlTree(['/']);
  }
  return auth.getUser()?.role === 'super_admin'
    ? true
    : router.createUrlTree(ROUTES.dashboardProjects);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // If user is already logged in:
  if (hasSession()) {
    return router.createUrlTree(auth.getHomeRoute(auth.getUser()));
  }

  // If on ANY Company domain / subdomain or Super Admin domain:
  // Default root page ('/') redirects to the Login page
  if (isCustomDomainHost()) {
    return router.createUrlTree(ROUTES.login);
  }

  // Bare root platform (default localhost or root site): allow landing page
  return true;
};

export const loginGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // If already logged in, redirect away from login page to their home workspace
  if (hasSession()) {
    return router.createUrlTree(auth.getHomeRoute(auth.getUser()));
  }

  // Default root domain (e.g. http://localhost:4200/login or http://localhost/todo/login)
  // does NOT have a login page — redirect directly to '/' (Landing page) unless a custom/company domain is active
  const hasCompanyQuery = Boolean(route.queryParamMap.get('company'));
  if (!isCustomDomainHost() && !hasCompanyQuery) {
    return router.createUrlTree(['/']);
  }

  // Custom company domain or superadmin domain: allow login page
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
