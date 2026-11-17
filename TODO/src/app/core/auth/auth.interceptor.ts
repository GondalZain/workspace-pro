import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ROUTES } from '../routing/route-paths';
import { isCustomDomainHost } from '../utils/domain.utils';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const injector = inject(Injector);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('todo-auth-token') : null;
  const authReq = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.includes('/auth/login') &&
        !request.url.includes('/auth/register') &&
        !request.url.includes('/auth/create-password')
      ) {
        const auth = injector.get(AuthService);
        const router = injector.get(Router);
        auth.logout();
        router.navigate(isCustomDomainHost() ? ROUTES.login : ['/']);
      }
      return throwError(() => error);
    })
  );
};