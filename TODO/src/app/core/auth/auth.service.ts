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
    this.migrateLegacyStorage();
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

  private migrateLegacyStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const legacyToken = localStorage.getItem(this.tokenKey);
      const legacyUserRaw = localStorage.getItem(this.userKey);
      if (legacyToken && legacyUserRaw) {
        const user = JSON.parse(legacyUserRaw) as User;
        const scope = user.role === 'super_admin' ? 'superadmin' : 'user';
        const scopedTokenKey = `${this.tokenKey}-${scope}`;
        const scopedUserKey = `${this.userKey}-${scope}`;
        if (!localStorage.getItem(scopedTokenKey)) {
          localStorage.setItem(scopedTokenKey, legacyToken);
        }
        if (!localStorage.getItem(scopedUserKey)) {
          localStorage.setItem(scopedUserKey, legacyUserRaw);
        }
      }
      // Always delete the un-scoped legacy keys so they never cross-contaminate sessions
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      sessionStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem(this.userKey);
    } catch {}
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

  private getScope(userOverride?: User | null): 'superadmin' | 'user' {
    if (userOverride?.role === 'super_admin') return 'superadmin';
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      if (path.startsWith('/super-admin') || isCustomDomainHost() && window.location.hostname.toLowerCase().startsWith('superadmin')) {
        return 'superadmin';
      }
    }
    return 'user';
  }

  private getScopedKey(baseKey: string, scope?: 'superadmin' | 'user'): string {
    const s = scope || this.getScope();
    return `${baseKey}-${s}`;
  }

  private readStorageItem(baseKey: string, scope?: 'superadmin' | 'user'): string | null {
    if (typeof window === 'undefined') return null;
    const scopedKey = this.getScopedKey(baseKey, scope);

    // 1. Check tab-isolated sessionStorage first (allows two tabs to hold different users)
    const sessionVal = sessionStorage.getItem(scopedKey);
    if (sessionVal) return sessionVal;

    // 2. Check persistent localStorage with scoped key
    const localVal = localStorage.getItem(scopedKey);
    if (localVal) return localVal;

    // STRICT ISOLATION: Never fall back to generic un-scoped keys or other scopes
    return null;
  }

  private writeStorageItem(baseKey: string, value: string, scope?: 'superadmin' | 'user'): void {
    if (typeof window === 'undefined') return;
    const scopedKey = this.getScopedKey(baseKey, scope);

    sessionStorage.setItem(scopedKey, value);
    localStorage.setItem(scopedKey, value);
  }

  private removeStorageItem(baseKey: string, scope?: 'superadmin' | 'user'): void {
    if (typeof window === 'undefined') return;
    const scopedKey = this.getScopedKey(baseKey, scope);

    sessionStorage.removeItem(scopedKey);
    localStorage.removeItem(scopedKey);
    sessionStorage.removeItem(baseKey);
    localStorage.removeItem(baseKey);
  }

  saveSession(response: LoginResponse | User): void {
    const user = 'user' in response ? response.user : response;
    const scope = user.role === 'super_admin' ? 'superadmin' : 'user';
    if ('token' in response) {
      this.writeStorageItem(this.tokenKey, response.token, scope);
    }
    this.writeStorageItem(this.userKey, JSON.stringify(user), scope);
    this.userSignal.set(user);
    this.applyUserTheme(user);
  }

  saveUser(user: User): void {
    const scope = user.role === 'super_admin' ? 'superadmin' : 'user';
    this.writeStorageItem(this.userKey, JSON.stringify(user), scope);
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

  private clearStoredSession(scopeOverride?: 'superadmin' | 'user'): void {
    if (typeof window === 'undefined') return;
    this.removeStorageItem(this.tokenKey, scopeOverride);
    this.removeStorageItem(this.userKey, scopeOverride);
  }

  getToken(scopeOverride?: 'superadmin' | 'user'): string | null {
    if (typeof window === 'undefined') return null;
    const token = this.readStorageItem(this.tokenKey, scopeOverride);
    if (!token) return null;
    if (this.isTokenExpired(token)) {
      this.clearStoredSession(scopeOverride);
      if (this.userSignal) {
        this.userSignal.set(null);
      }
      return null;
    }
    return token;
  }

  private readInitialUser(): User | null {
    return this.readScopedUser();
  }

  private readScopedUser(scopeOverride?: 'superadmin' | 'user'): User | null {
    if (typeof window === 'undefined') return null;
    const token = this.getToken(scopeOverride);
    if (!token) return null;
    const raw = this.readStorageItem(this.userKey, scopeOverride);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User | null;
    } catch {
      return null;
    }
  }

  getUser(scopeOverride?: 'superadmin' | 'user'): User | null {
    if (!this.getToken(scopeOverride)) return null;
    return this.readScopedUser(scopeOverride) || this.userSignal();
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

  logout(redirect = true): void {
    const user = this.userSignal();
    let companyTarget: string | null = null;
    if (user && user.role !== 'super_admin' && user.company) {
      companyTarget = user.company.domain || user.company.name;
    }

    if (typeof window !== 'undefined') {
      // 1. Wipe tab-level sessionStorage
      sessionStorage.clear();

      // 2. Wipe all user and superadmin tokens from persistent localStorage
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(`${this.tokenKey}-user`);
      localStorage.removeItem(`${this.userKey}-user`);
      localStorage.removeItem(`${this.tokenKey}-superadmin`);
      localStorage.removeItem(`${this.userKey}-superadmin`);
    }

    this.userSignal.set(null);
    this.companyTheme.resetDefaultTheme();

    if (redirect) {
      if (companyTarget) {
        this.router.navigate(['/login'], { queryParams: { company: companyTarget } });
      } else {
        this.router.navigateByUrl('/login');
      }
    }
  }

  applyUserTheme(user: User | null): void {
    if (user?.company) {
      this.companyTheme.applyCompanyTheme(user.company.primaryColor, user.company.secondaryColor);
    } else {
      this.companyTheme.resetDefaultTheme();
    }
  }
}