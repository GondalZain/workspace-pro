import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/api/api.config';
import { ROUTE_URL } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-super-admin-settings-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './super-admin-settings.page.html',
  styleUrl: './super-admin-settings.page.css'
})
export class SuperAdminSettingsPageComponent {
  private readonly auth = inject(AuthService);

  protected readonly apiOrigin = API_BASE_URL.replace(/\/api$/, '');
  protected readonly routes = ROUTE_URL;

  protected readonly user = signal(this.auth.getUser());
  
  // Profile form state
  protected readonly username = signal(this.user()?.username || '');
  protected readonly email = signal(this.user()?.email || '');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  
  // Profile image upload state
  protected readonly profileImageFile = signal<File | null>(null);
  protected readonly imagePreviewUrl = signal<string | null>(null);
  protected readonly removeImage = signal(false);

  // Status state
  protected readonly isSaving = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly currentAvatarUrl = computed(() => {
    if (this.imagePreviewUrl()) return this.imagePreviewUrl();
    if (this.removeImage()) return null;
    const path = this.user()?.profileImagePath;
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${this.apiOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
  });

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.profileImageFile.set(file);
      this.removeImage.set(false);

      const reader = new FileReader();
      reader.onload = (e) => this.imagePreviewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  protected removeProfileImage(): void {
    this.profileImageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.removeImage.set(true);
  }

  protected saveProfile(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    const un = this.username().trim();
    const em = this.email().trim();
    const pass = this.newPassword();
    const confirm = this.confirmPassword();

    if (!un || !em) {
      this.errorMessage.set('Username and Email are required.');
      return;
    }

    if (pass && pass.length < 8) {
      this.errorMessage.set('New password must be at least 8 characters.');
      return;
    }

    if (pass && pass !== confirm) {
      this.errorMessage.set('New password and Confirmation do not match.');
      return;
    }

    this.isSaving.set(true);

    this.auth.updateProfile(un, em, pass, this.profileImageFile(), this.removeImage()).subscribe({
      next: (updatedUser) => {
        this.auth.saveUser(updatedUser);
        this.user.set(updatedUser);
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.profileImageFile.set(null);
        this.imagePreviewUrl.set(null);
        this.removeImage.set(false);
        this.isSaving.set(false);
        this.successMessage.set('Super Admin profile updated successfully!');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to update profile.');
      }
    });
  }
}
