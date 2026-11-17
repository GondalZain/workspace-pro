import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../api/api.config';
import { API_ROUTES } from '../api/api.routes';
import { ROUTES } from '../routing/route-paths';
import { CompanyThemeService } from '../theme/company-theme.service';
import { isCustomDomainHost } from '../utils/domain.utils';

export interface CompanyInfo {
  id: number;
  name: string;
  title: string;
  description: string;
  logoPath: string | null;
  primaryColor: string;
  secondaryColor: string;
  emailDomain?: string | null;
  domain?: string | null;
  planId?: string;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  profileImagePath: string | null;
  role: 'super_admin' | 'admin' | 'editor' | 'user' | 'viewer';
  roleId: number | null;
  companyId?: number | null;
  company?: CompanyInfo | null;
  permissions: string[];
}

export interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly companyTheme = inject(CompanyThemeService);
  private readonly tokenKey = 'todo-auth-token';
  private readonly userKey = 'todo-auth-user';

  readonly userSignal = signal<User | null>(this.readInitialUser());

  refreshCurrentUser() {
    return this.http.get<User>(`${API_BASE_URL}/auth/me`);
  }

  constructor() {
    this.applyUserTheme(this.getUser());
    if (this.getToken()) {
      this.refreshCurrentUser().subscribe({
        next: (freshUser) => {
          if (freshUser) {
            this.saveUser(freshUser);
          }
        },
        error: (err) => {
          console.warn('Could not refresh current user on start:', err);
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.logout();
            this.router.navigate(isCustomDomainHost() ? ROUTES.login : ['/']);
          }
        }
      });
    }
  }


  login(email: string, password: string, companyId?: number | null) {
    const payload: { email: string; password: string; companyId?: number } = { email, password };
    if (companyId) {
      payload.companyId = companyId;
    }
    return this.http.post<LoginResponse>(`${API_BASE_URL}${API_ROUTES.auth.login}`, payload);
  }

  registerWorkspace(payload: { companyName: string; workEmail: string; fullName: string; password?: string; planId?: string }) {
    return this.http.post<{ success: boolean; status: string; message: string; company: any }>(
      `${API_BASE_URL}/auth/workspace-register`,
      payload
    );
  }

  verifyPasswordToken(token: string) {
    return this.http.get<{ valid: boolean; email: string; username: string; company: CompanyInfo }>(
      `${API_BASE_URL}/auth/verify-password-token`,
      { params: { token } }
    );
  }

  createPasswordWithToken(payload: { token: string; password: string }) {
    return this.http.post<{ success: boolean; message: string; user: any; company: any }>(
      `${API_BASE_URL}/auth/create-password`,
      payload
    );
  }

  lookupCompany(domain?: string) {
    const params: Record<string, string> = {};
    if (domain) params['domain'] = domain;
    return this.http.get<CompanyInfo | null>(`${API_BASE_URL}/auth/company-lookup`, { params });
  }

  register(username: string, email: string, password: string, profileImage: File | null) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    formData.append('password', password);
    if (profileImage) formData.append('profileImage', profileImage);
    return this.http.post<LoginResponse>(`${API_BASE_URL}${API_ROUTES.auth.register}`, formData);
  }

  updateProfile(username: string, email: string, password: string, profileImage: File | null, removeCurrentImage = false) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    if (password) formData.append('password', password);
    if (removeCurrentImage) formData.append('removeProfileImage', 'true');
    if (profileImage) formData.append('profileImage', profileImage);
    return this.http.put<User>(`${API_BASE_URL}${API_ROUTES.auth.profile}`, formData);
  }

  private getStoredUser(): User | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      return JSON.parse(localStorage.getItem(this.userKey) || 'null') as User | null;
    } catch {
      return null;
    }
  }

  saveSession(response: LoginResponse | User): void {
    const user = 'user' in response ? response.user : response;
    if ('token' in response) localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.userSignal.set(user);
    this.applyUserTheme(user);
  }

  saveUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.userSignal.set(user);
    this.applyUserTheme(user);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const payload = JSON.parse(atob(padded)) as { exp?: number };
      if (typeof payload.exp !== 'number') return false;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private clearStoredSession(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return null;
    if (this.isTokenExpired(token)) {
      this.clearStoredSession();
      if (this.userSignal) {
        this.userSignal.set(null);
      }
      return null;
    }
    return token;
  }

  private readInitialUser(): User | null {
    if (typeof localStorage === 'undefined') return null;
    const token = localStorage.getItem(this.tokenKey);
    if (!token || this.isTokenExpired(token)) {
      this.clearStoredSession();
      return null;
    }
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  getUser(): User | null {
    if (!this.getToken()) return null;
    return this.userSignal() || this.readInitialUser();
  }

  isAdminUser(user: User | null | undefined): boolean {
    if (!user) return false;
    return (
      user.role === 'admin' ||
      user.permissions?.includes('users.manage') === true ||
      user.permissions?.includes('statuses.manage') === true
    );
  }

  getHomeRoute(user: User | null | undefined): readonly string[] {
    if (user?.role === 'super_admin') {
      return ['/super-admin/dashboard'];
    }
    if (this.isAdminUser(user)) {
      return ROUTES.admin;
    }
    return ROUTES.dashboardProjects;
  }

  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.userSignal.set(null);
    this.companyTheme.resetDefaultTheme();
  }

  applyUserTheme(user: User | null): void {
    if (user?.company) {
      this.companyTheme.applyCompanyTheme(user.company.primaryColor, user.company.secondaryColor);
    } else {
      this.companyTheme.resetDefaultTheme();
    }
  }
}