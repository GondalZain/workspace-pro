import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminApiService, Role } from '../../../core/api/admin-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminPageHeaderComponent } from '../../../components/admin-page-header/admin-page-header';
import { ROUTES } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-admin-user-create-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AdminPageHeaderComponent
  ],
  templateUrl: './user-create.page.html',
  styleUrl: './user-create.page.css'
})
export class AdminUserCreatePage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly roles = signal<Role[]>([]);
  protected readonly username = signal('');
  protected readonly email = signal('');
  protected readonly originalEmail = signal('');
  protected readonly password = signal('');
  protected readonly selectedRoleId = signal<number | null>(null);
  protected readonly profileImageFile = signal<File | null>(null);
  protected readonly profileImagePreview = signal<string | null>(null);
  
  protected readonly showPassword = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly currentUser = computed(() => this.auth.getUser());
  protected readonly company = computed(() => this.currentUser()?.company || null);
  
  protected readonly companyDomain = computed(() => {
    const raw = this.company()?.emailDomain?.trim() || '';
    if (!raw) return '';
    return raw.startsWith('@') ? raw.slice(1).toLowerCase() : raw.toLowerCase();
  });

  protected readonly companyName = computed(() => this.company()?.name || 'Company');

  protected readonly suggestedEmail = computed(() => {
    const u = this.username().trim().toLowerCase().replace(/\s+/g, '.');
    const domain = this.companyDomain();
    if (u && domain) {
      return `${u}@${domain}`;
    }
    return '';
  });

  protected readonly emailDomainMismatch = computed(() => {
    const domain = this.companyDomain();
    const currentEmail = this.email().trim().toLowerCase();
    if (!domain || !currentEmail || !currentEmail.includes('@')) return false;
    return !currentEmail.endsWith(`@${domain}`);
  });

  ngOnInit(): void {
    this.api.listRoles().subscribe({
      next: (rolesList) => {
        // Exclude super_admin from company admin creation dropdown
        const filtered = rolesList.filter(r => r.name !== 'super_admin');
        this.roles.set(filtered);
        // Default role to 'user' or 'member' if available
        const defaultRole = filtered.find(r => r.name === 'user') || filtered[0];
        if (defaultRole) {
          this.selectedRoleId.set(defaultRole.id);
        }
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Could not load security roles.')
    });
  }

  protected applySuggestedEmail(): void {
    const suggested = this.suggestedEmail();
    if (suggested) {
      this.email.set(suggested);
    }
  }

  protected generatePassword(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let res = '';
    for (let i = 0; i < 14; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.password.set(res);
    this.showPassword.set(true);
  }

  protected toggleShowPassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.profileImageFile.set(file);
      const reader = new FileReader();
      reader.onload = () => this.profileImagePreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  protected removeProfileImage(): void {
    this.profileImageFile.set(null);
    this.profileImagePreview.set(null);
  }

  protected selectRole(roleId: number): void {
    this.selectedRoleId.set(roleId);
  }

  protected goBack(): void {
    this.router.navigate(ROUTES.adminUsers);
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) return;

    const nameVal = this.username().trim();
    const emailVal = this.email().trim();
    const passVal = this.password();
    const roleVal = this.selectedRoleId();

    if (!nameVal) {
      this.errorMessage.set('Username is required.');
      return;
    }
    if (!emailVal || !/^\S+@\S+\.\S+$/.test(emailVal)) {
      this.errorMessage.set('A valid email address is required.');
      return;
    }
    if (!passVal || passVal.length < 8) {
      this.errorMessage.set('Password must be at least 8 characters long.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.api.createUser({
      username: nameVal,
      email: emailVal,
      originalEmail: this.originalEmail().trim() || undefined,
      password: passVal,
      roleId: roleVal || undefined,
      profileImage: this.profileImageFile()
    }).subscribe({
      next: (newUser) => {
        this.isSubmitting.set(false);
        this.successMessage.set(`Account for "${newUser.username}" was created successfully!`);
        setTimeout(() => {
          this.router.navigate(ROUTES.adminUsers);
        }, 1200);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to create user account.');
      }
    });
  }
}
