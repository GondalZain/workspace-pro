import { Routes } from '@angular/router';
import { guestGuard, loginGuard } from '../auth/auth.guard';
import { AUTH_PATH } from './route-paths';
import { LoginComponent } from '../../components/login/login';

export const authRoutes: Routes = [
  {
    path: AUTH_PATH.landing,
    loadComponent: () => import('../../components/landing/landing.component').then((m) => m.LandingComponent),
    canActivate: [guestGuard]
  },
  {
    path: AUTH_PATH.pricing,
    loadComponent: () => import('../../components/pricing/pricing.component').then((m) => m.PricingComponent),
    canActivate: [guestGuard]
  },
  {
    path: AUTH_PATH.team,
    loadComponent: () => import('../../components/team/team.component').then((m) => m.TeamComponent),
    canActivate: [guestGuard]
  },
  {
    path: AUTH_PATH.login,
    component: LoginComponent,
    canActivate: [loginGuard]
  },
  {
    path: AUTH_PATH.register,
    loadComponent: () => import('../../components/register/register.component').then((m) => m.RegisterComponent),
    canActivate: [guestGuard]
  },
  {
    path: AUTH_PATH.createPassword,
    loadComponent: () => import('../../components/create-password/create-password.component').then((m) => m.CreatePasswordComponent)
  }
];