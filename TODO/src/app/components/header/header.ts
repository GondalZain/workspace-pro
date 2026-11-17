import { Component, computed, inject, model, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { createProfileForm, patchFormIfChanged, profileFormValueFromRaw } from '../../core/forms';
import { ROUTE_URL, ROUTES } from '../../core/routing/route-paths';
import { API_BASE_URL } from '../../core/api/api.config';
import { FormFieldErrorComponent } from '../../shared/forms';
import { ProfileImagePickerComponent } from '../profile-image-picker/profile-image-picker';
import { NotificationBellComponent } from '../notification-bell/notification-bell';

import { SubscriptionService, FRONTEND_SUBSCRIPTION_PLANS } from '../../core/subscription/subscription.service';
import { SubscriptionModalComponent } from '../subscription-modal/subscription-modal';
import { WorkspaceNavComponent } from '../workspace-nav/workspace-nav';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ReactiveFormsModule, FormFieldErrorComponent, ProfileImagePickerComponent, NotificationBellComponent, SubscriptionModalComponent, WorkspaceNavComponent],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly subService = inject(SubscriptionService);

  protected readonly user = computed(() => this.auth.userSignal());
  protected readonly apiOrigin = API_BASE_URL.replace(/\/api$/, '');
  protected readonly isSuperAdmin = computed(() => this.user()?.role === 'super_admin');
  protected readonly isAdmin = computed(() => this.isSuperAdmin() || this.auth.isAdminUser(this.user()));

  protected readonly currentPlanId = computed(() => this.subService.currentPlanId());
  protected readonly currentPlanName = computed(() => {
    const planId = this.currentPlanId();
    return FRONTEND_SUBSCRIPTION_PLANS[planId]?.name || 'Free Trial';
  });

  protected readonly companyName = computed(() => this.user()?.company?.name || 'Tangent Technologies');
  protected readonly companyTitle = computed(() => this.user()?.company?.title || 'Workspace Pro');
  protected readonly companyDescription = computed(() => this.user()?.company?.description || '');
  protected readonly companyLogo = computed(() => this.user()?.company?.logoPath ? (this.apiOrigin + this.user()?.company?.logoPath) : null);
  protected readonly companyInitial = computed(() => (this.user()?.company?.name || 'T').charAt(0).toUpperCase());

  protected readonly url = ROUTE_URL;
  protected readonly isAdminPanel = signal(this.router.url.startsWith(ROUTE_URL.admin));
  protected readonly brandHomeLink = computed(() => (this.isAdminPanel() ? this.url.admin : this.url.dashboardProjects));

  protected openPlanModal(): void {
    this.subService.openModal();
  }
  protected readonly showProfileSettings = signal(false);
  protected readonly profileForm = createProfileForm(this.fb);
  protected readonly profileSubmitAttempted = signal(false);
  protected readonly profileImage = model<File | null>(null);
  protected readonly removeCurrentProfileImage = model(false);
  protected readonly profileError = signal('');
  protected readonly isSavingProfile = signal(false);

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.isAdminPanel.set((event as NavigationEnd).urlAfterRedirects.startsWith(ROUTE_URL.admin));
    });
  }

  protected toggleProfileSettings(): void {
    const user = this.auth.getUser();
    // user is computed from auth.userSignal
    patchFormIfChanged(this.profileForm, {
      username: user?.username ?? '',
      email: user?.email ?? ''
    });
    this.profileImage.set(null);
    this.removeCurrentProfileImage.set(false);
    this.profileError.set('');
    this.showProfileSettings.set(!this.showProfileSettings());
  }

  protected saveProfile(): void {
    this.profileSubmitAttempted.set(true);
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) {
      this.profileError.set('Please enter a valid username and email.');
      return;
    }
    this.profileSubmitAttempted.set(false);

    const { username, email } = profileFormValueFromRaw(this.profileForm.getRawValue());
    this.isSavingProfile.set(true);
    this.profileError.set('');
    this.auth.updateProfile(username, email, '', this.profileImage(), this.removeCurrentProfileImage()).subscribe({
      next: (response) => {
        this.auth.saveUser(response);
        // user is computed from auth.userSignal
        patchFormIfChanged(this.profileForm, {
          username: response.username,
          email: response.email
        });
        this.profileImage.set(null);
        this.removeCurrentProfileImage.set(false);
        this.isSavingProfile.set(false);
        this.showProfileSettings.set(false);
      },
      error: (error) => {
        this.profileError.set(error.error?.error || 'Unable to update your profile.');
        this.isSavingProfile.set(false);
      }
    });
  }

  protected logout(): void {
    this.auth.logout();
    // user is computed from auth.userSignal
    this.router.navigate(ROUTES.login);
  }
}
