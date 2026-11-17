import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Role } from '../../core/api/admin-api.service';
import { User } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/api/api.config';
import {
  adminUserProfileFormValueFromRaw,
  createAdminUserProfileForm,
  patchFormIfChanged
} from '../../core/forms';
import { FormFieldErrorComponent } from '../../shared/forms';
import { ProfileImagePickerComponent } from '../profile-image-picker/profile-image-picker';

export interface UserProfileChange {
  userId: number;
  username: string;
  email: string;
  profileImage?: File | null;
  roleId: number;
}

@Component({
  selector: 'app-admin-user-settings',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldErrorComponent, ProfileImagePickerComponent],
  templateUrl: './admin-user-settings.html',
  styleUrl: './admin-user-settings.css'
})
export class AdminUserSettingsComponent {
  readonly user = input.required<User | null>();
  readonly roles = input.required<Role[]>();
  readonly profileSaved = output<UserProfileChange>();
  readonly closed = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = createAdminUserProfileForm(this.fb);
  protected readonly submitAttempted = signal(false);
  protected readonly apiOrigin = API_BASE_URL.replace(/\/api$/, '');
  protected readonly editProfileImage = model<File | null>(null);
  protected readonly removeProfileImage = model(false);

  protected readonly currentUserImageUrl = computed(() => {
    const user = this.user();
    if (!user?.profileImagePath) return null;
    return user.profileImagePath.startsWith('http')
      ? user.profileImagePath
      : `${this.apiOrigin}${user.profileImagePath}`;
  });

  protected readonly currentPermissions = computed(() => {
    const selectedId = this.form.controls.roleId.value;
    if (selectedId) {
      const role = this.roles().find((r) => Number(r.id) === Number(selectedId));
      if (role?.permissions?.length) return role.permissions;
    }
    return this.user()?.permissions || [];
  });

  constructor() {
    effect(() => {
      const currentUser = this.user();
      const rolesList = this.roles();
      if (!currentUser) return;

      const matched = rolesList.find(
        (r) => Number(r.id) === Number(currentUser.roleId) ||
               r.name.toLowerCase() === currentUser.role?.toLowerCase()
      );
      const resolvedRoleId = matched?.id ?? (currentUser.roleId ? Number(currentUser.roleId) : null);

      patchFormIfChanged(this.form, {
        username: currentUser.username || '',
        email: currentUser.email || '',
        roleId: resolvedRoleId
      });
      this.editProfileImage.set(null);
      this.removeProfileImage.set(false);
    });
  }

  protected saveProfile(): void {
    const currentUser = this.user();
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();
    if (!currentUser || this.form.invalid) {
      return;
    }
    this.submitAttempted.set(false);

    const { username, email, roleId } = adminUserProfileFormValueFromRaw(this.form.getRawValue());
    this.profileSaved.emit({
      userId: currentUser.id,
      username,
      email,
      profileImage: this.editProfileImage(),
      roleId: roleId || 0
    });
  }

  protected cancel(): void {
    this.closed.emit();
  }

}
