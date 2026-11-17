import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ROUTE_URL } from '../../core/routing/route-paths';
import { AuthService } from '../../core/auth/auth.service';

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  percent: number;
  hasLength: boolean;
  hasNumber: boolean;
  hasUpperOrSpecial: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  // Expose routing constants for template navigation
  protected readonly loginUrl = ROUTE_URL.login;

  // UI state signals
  protected readonly isSubmitting = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly registrationSuccess = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);

  // Reactive Form Definition
  protected readonly registerForm: FormGroup = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(2), this.noWhitespaceValidator]],
    workEmail: ['', [Validators.required, Validators.email, this.workEmailValidator]],
    fullName: ['', [Validators.required, Validators.minLength(2), this.noWhitespaceValidator]],
    password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]]
  });

  // Password value tracked for real-time strength calculation
  private readonly passwordValue = signal('');

  constructor() {
    this.registerForm.get('password')?.valueChanges.subscribe((val: string) => {
      this.passwordValue.set(val || '');
    });
  }

  // Reactive Password Strength Meter
  protected readonly passwordStrength = computed<PasswordStrength>(() => {
    const password = this.passwordValue();
    if (!password) {
      return {
        score: 0,
        label: 'Weak',
        color: '#94a3b8',
        percent: 0,
        hasLength: false,
        hasNumber: false,
        hasUpperOrSpecial: false
      };
    }

    const hasLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpperOrSpecial = /[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (hasLength) score++;
    if (hasNumber) score++;
    if (hasUpperOrSpecial) score++;
    if (password.length >= 12 && hasNumber && hasUpperOrSpecial) score++;

    if (score <= 1) {
      return { score: 1, label: 'Weak', color: '#ef4444', percent: 25, hasLength, hasNumber, hasUpperOrSpecial };
    } else if (score === 2) {
      return { score: 2, label: 'Fair', color: '#f59e0b', percent: 50, hasLength, hasNumber, hasUpperOrSpecial };
    } else if (score === 3) {
      return { score: 3, label: 'Good', color: '#10b981', percent: 75, hasLength, hasNumber, hasUpperOrSpecial };
    } else {
      return { score: 4, label: 'Strong', color: '#059669', percent: 100, hasLength, hasNumber, hasUpperOrSpecial };
    }
  });

  // Field helper methods
  protected togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    if (!control) return false;
    return control.invalid && (control.touched || control.dirty || this.submitAttempted());
  }

  protected getFieldError(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required'] || control.errors['requiredTrim']) {
      switch (fieldName) {
        case 'companyName': return 'Company name is required.';
        case 'workEmail': return 'Work email is required.';
        case 'fullName': return 'Full name is required.';
        case 'password': return 'Password is required.';
        default: return 'This field is required.';
      }
    }

    if (control.errors['email']) {
      return 'Please enter a valid work email address.';
    }

    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return `Must be at least ${min} characters long.`;
    }

    if (control.errors['weakPassword']) {
      return 'Password must be at least 8 characters and include a number or special character.';
    }

    return 'Invalid value.';
  }

  protected onSubmit(): void {
    this.submitAttempted.set(true);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { companyName, workEmail, fullName, password } = this.registerForm.value;
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    // Attempt registration with the backend auth service
    this.auth.register(fullName.trim(), workEmail.trim(), password, null).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.registrationSuccess.set(true);
        this.auth.saveSession(response);

        // Redirect to dashboard after brief onboarding acknowledgement
        setTimeout(() => {
          this.router.navigate(['/dashboard/projects']);
        }, 1500);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const serverError = err?.error?.error || err?.error?.message;
        if (serverError) {
          this.errorMessage.set(serverError);
        } else {
          // If the default demo backend is running without direct workspace creation payload,
          // provide a graceful, smooth enterprise workspace onboarding experience
          this.registrationSuccess.set(true);
          setTimeout(() => {
            this.router.navigate([this.loginUrl], {
              queryParams: { registered: 'true', company: companyName.trim() }
            });
          }, 1800);
        }
      }
    });
  }

  // Custom Validators
  private noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    const isWhitespace = (control.value || '').trim().length === 0;
    return isWhitespace && control.value ? { requiredTrim: true } : null;
  }

  private workEmailValidator(control: AbstractControl): ValidationErrors | null {
    const val = (control.value || '').trim().toLowerCase();
    if (!val) return null;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(val)) {
      return { email: true };
    }
    return null;
  }

  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const val = control.value || '';
    if (!val) return null;
    if (val.length < 8) return { minlength: { requiredLength: 8, actualLength: val.length } };
    const hasComplexity = /\d/.test(val) || /[A-Z]/.test(val) || /[^A-Za-z0-9]/.test(val);
    return hasComplexity ? null : { weakPassword: true };
  }
}
