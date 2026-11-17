import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService, CompanyInfo } from '../../core/auth/auth.service';
import { CompanyThemeService } from '../../core/theme/company-theme.service';
import { API_BASE_URL } from '../../core/api/api.config';
import { getTenantDomainUrl } from '../../core/utils/domain.utils';

@Component({
  selector: 'app-create-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './create-password.component.html',
  styleUrl: './create-password.component.scss'
})
export class CreatePasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly companyTheme = inject(CompanyThemeService);

  readonly uploadBaseUrl = API_BASE_URL.replace(/\/api$/, '');

  token = signal<string>('');
  isValidatingToken = signal<boolean>(true);
  tokenValid = signal<boolean>(false);
  tokenErrorMessage = signal<string | null>(null);

  userEmail = signal<string>('');
  userName = signal<string>('');
  companyInfo = signal<CompanyInfo | null>(null);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  isSuccess = signal<boolean>(false);
  targetLoginUrl = signal<string>('/login');

  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  readonly passwordForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (!token) {
        this.isValidatingToken.set(false);
        this.tokenValid.set(false);
        this.tokenErrorMessage.set('No verification token found in link. Please use the link sent to your email.');
        return;
      }

      this.token.set(token);
      this.validateToken(token);
    });
  }

  private validateToken(token: string): void {
    this.isValidatingToken.set(true);
    this.tokenErrorMessage.set(null);

    this.auth.verifyPasswordToken(token).subscribe({
      next: (res) => {
        this.isValidatingToken.set(false);
        this.tokenValid.set(true);
        this.userEmail.set(res.email);
        this.userName.set(res.username);
        this.companyInfo.set(res.company);

        // Apply company branding dynamically
        if (res.company) {
          this.companyTheme.applyCompanyTheme(res.company.primaryColor, res.company.secondaryColor);
        }
      },
      error: (err) => {
        this.isValidatingToken.set(false);
        this.tokenValid.set(false);
        this.tokenErrorMessage.set(
          err.error?.error || 'Invalid or expired setup link. Please contact your administrator.'
        );
      }
    });
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(v => !v);
  }

  getLogoUrl(path?: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
    return `${this.uploadBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  onSubmit(): void {
    if (this.passwordForm.invalid || this.isSubmitting()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const password = this.passwordForm.value.password;
    this.auth.createPasswordWithToken({
      token: this.token(),
      password
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);

        const company = res.company || this.companyInfo();
        let redirectTarget = '/login';

        if (company?.domain) {
          const currentHost = window.location.hostname;
          const dom = company.domain.trim();
          if (currentHost === dom) {
            redirectTarget = '/login';
          } else {
            redirectTarget = getTenantDomainUrl(dom, '/login');
          }
        }

        this.targetLoginUrl.set(redirectTarget);

        // Automatically navigate after 3.5 seconds
        setTimeout(() => {
          this.navigateToLogin();
        }, 3500);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to create password. Please try again.');
      }
    });
  }

  navigateToLogin(): void {
    const target = this.targetLoginUrl();
    if (target.startsWith('http://') || target.startsWith('https://')) {
      window.location.href = target;
    } else {
      this.router.navigateByUrl(target);
    }
  }
}
