import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService, CompanyInfo } from '../../core/auth/auth.service';
import { CompanyThemeService } from '../../core/theme/company-theme.service';
import { createLoginForm, loginFormValueFromRaw } from '../../core/forms';
import { ROUTES, ROUTE_URL } from '../../core/routing/route-paths';
import { API_BASE_URL } from '../../core/api/api.config';
import { FormFieldErrorComponent } from '../../shared/forms';
import { isSuperAdminHost } from '../../core/utils/domain.utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, FormFieldErrorComponent],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  protected readonly registerUrl = ROUTE_URL.register;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly companyTheme = inject(CompanyThemeService);

  protected readonly form = createLoginForm(this.fb);
  protected readonly submitAttempted = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isPendingApproval = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly detectedCompany = signal<CompanyInfo | null>(null);
  // Start in loading state until domain/company branding & logo finish resolving
  protected readonly isLoadingCompany = signal(true);
  protected readonly isSuperAdmin = signal(isSuperAdminHost());
  // Tracks aspect ratio of the company logo ('square' | 'wide' | 'tall') so any logo size fits cleanly
  protected readonly logoAspect = signal<'square' | 'wide' | 'tall'>('square');

  // Dynamic primary brand color (defaults to platform teal #0f766e if not a company domain)
  protected readonly activePrimaryColor = computed(() => {
    return this.detectedCompany()?.primaryColor?.trim() || '#0f766e';
  });

  private readonly uploadBaseUrl = API_BASE_URL.replace(/\/api$/, '');

  ngOnInit(): void {
    const currentDomain = window.location.hostname;
    const companyQuery = this.route.snapshot.queryParamMap.get('company');
    const pendingQuery = this.route.snapshot.queryParamMap.get('pending');
    const emailQuery = this.route.snapshot.queryParamMap.get('email');

    if (emailQuery) {
      this.form.controls.email.setValue(emailQuery);
    }

    if (pendingQuery === 'true') {
      this.isPendingApproval.set(true);
      this.errorMessage.set(
        'Workspace registration submitted successfully! Please check your email inbox—your workspace is waiting for super admin approval.'
      );
    }

    // Always start in clean loader state so no previous or default data flashes
    this.isLoadingCompany.set(true);
    this.detectedCompany.set(null);

    // 1. If on Super Admin domain, use Super Admin branding directly
    if (this.isSuperAdmin()) {
      this.companyTheme.resetDefaultTheme();
      this.isLoadingCompany.set(false);
      return;
    }

    // 2. On default root platform (localhost or base cloud domain) without ?company=, display the official Workspace Pro portal
    const isRootPlatform =
      currentDomain === 'localhost' ||
      currentDomain === '127.0.0.1' ||
      currentDomain.endsWith('.vercel.app') ||
      currentDomain.endsWith('.netlify.app') ||
      currentDomain === (window.__env?.BASE_DOMAIN || '').trim();

    if (isRootPlatform && !companyQuery) {
      sessionStorage.removeItem(`cached_company_${currentDomain}`);
      this.companyTheme.resetDefaultTheme();
      this.detectedCompany.set(null);
      this.isLoadingCompany.set(false);
      return;
    }

    const lookupQuery = companyQuery || currentDomain;
    const cacheKey = `cached_company_${lookupQuery}`;

    // Always fetch authoritative company branding from server while keeping the loader active,
    // using sessionStorage only as an offline fallback if the network request fails.
    this.auth.lookupCompany(lookupQuery).subscribe({
      next: (company) => {
        if (company) {
          try { sessionStorage.setItem(cacheKey, JSON.stringify(company)); } catch {}
          this.applyCompanyAndPreloadLogo(company);
        } else {
          sessionStorage.removeItem(cacheKey);
          this.companyTheme.resetDefaultTheme();
          this.detectedCompany.set(null);
          this.isLoadingCompany.set(false);
        }
      },
      error: () => {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const fallbackCompany: CompanyInfo = JSON.parse(cached);
            if (fallbackCompany) {
              this.applyCompanyAndPreloadLogo(fallbackCompany);
              return;
            }
          } catch {}
        }
        this.companyTheme.resetDefaultTheme();
        this.detectedCompany.set(null);
        this.isLoadingCompany.set(false);
      }
    });
  }

  private applyCompanyAndPreloadLogo(company: CompanyInfo): void {
    this.detectedCompany.set(company);
    this.companyTheme.applyCompanyTheme(company.primaryColor, company.secondaryColor);

    const logoUrl = this.getLogoUrl(company.logoPath);
    if (!logoUrl) {
      this.isLoadingCompany.set(false);
      return;
    }

    // Preload company logo image and detect its natural aspect ratio before revealing portal
    const img = new Image();
    const done = () => this.isLoadingCompany.set(false);
    const timeout = setTimeout(done, 1500);
    img.onload = () => {
      clearTimeout(timeout);
      this.updateLogoAspect(img.naturalWidth, img.naturalHeight);
      done();
    };
    img.onerror = () => {
      clearTimeout(timeout);
      done();
    };
    img.src = logoUrl;
  }

  protected onLogoImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img && img.naturalWidth && img.naturalHeight) {
      this.updateLogoAspect(img.naturalWidth, img.naturalHeight);
    }
  }

  private updateLogoAspect(width: number, height: number): void {
    if (!width || !height) return;
    const ratio = width / height;
    if (ratio > 1.25) {
      this.logoAspect.set('wide');
    } else if (ratio < 0.8) {
      this.logoAspect.set('tall');
    } else {
      this.logoAspect.set('square');
    }
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected getLogoUrl(path?: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
    return `${this.uploadBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  protected submit(): void {
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isLoading()) {
      return;
    }

    const { email, password } = loginFormValueFromRaw(this.form.getRawValue());
    this.errorMessage.set('');
    this.isPendingApproval.set(false);
    this.isLoading.set(true);
    const companyId = this.detectedCompany()?.id || null;
    this.auth.login(email, password, companyId).subscribe({
      next: (response) => {
        this.auth.saveSession(response);
        this.submitted.set(true);
        this.isLoading.set(false);

        this.router.navigate(this.auth.getHomeRoute(response.user));
      },
      error: (error) => {
        const msg = error.error?.error || 'Unable to sign in. Please try again.';
        const isPending = msg.toLowerCase().includes('waiting for approval') || error.error?.code === 'APPROVAL_PENDING';
        this.isPendingApproval.set(isPending);
        this.errorMessage.set(msg);
        this.isLoading.set(false);
      }
    });
  }
}