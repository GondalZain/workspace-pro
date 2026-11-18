import { Component, EventEmitter, Input, Output, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyAdmin } from '../../../models/company.model';
import { Role } from '../../../core/api/admin-api.service';
import { API_BASE_URL } from '../../../core/api/api.config';

@Component({
  selector: 'app-company-admins-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-admins-tab.html',
  styleUrl: './company-admins-tab.css'
})
export class CompanyAdminsTabComponent {
  protected readonly apiOrigin = API_BASE_URL.replace(/\/api$/, '');

  @Input() companyName: string = '';
  @Input() emailDomain: string = '';
  @Input() admins: CompanyAdmin[] = [];
  @Input() allRoles: Role[] = [];
  @Input({ required: true }) primaryColor!: string;

  newAdminUsername = model<string>('');
  newAdminEmail = model<string>('');
  newAdminOriginalEmail = model<string>('');
  newAdminPassword = model<string>('');
  selectedRoleIdForNewAdmin = model<number | null>(null);

  @Input() adminError: string | null = null;
  @Input() isAddingAdmin: boolean = false;

  // Edit Admin Modal State
  editingAdmin = signal<CompanyAdmin | null>(null);
  editAdminUsername = signal('');
  editAdminEmail = signal('');
  editAdminOriginalEmail = signal('');
  editAdminPassword = signal('');
  editAdminRoleId = signal<number | null>(null);
  @Input() isSavingAdminEdit: boolean = false;
  @Input() editAdminError: string | null = null;

  @Output() changeAdminRole = new EventEmitter<{ admin: CompanyAdmin; targetRoleIdStr: string }>();
  @Output() removeAdmin = new EventEmitter<CompanyAdmin>();
  @Output() submitAddAdmin = new EventEmitter<void>();
  @Output() submitEditAdmin = new EventEmitter<{ adminId: number; username: string; email: string; originalEmail?: string; password?: string; roleId?: number }>();

  openEditAdminModal(adm: CompanyAdmin): void {
    this.editingAdmin.set(adm);
    this.editAdminUsername.set(adm.username);
    this.editAdminEmail.set(adm.email);
    this.editAdminOriginalEmail.set(adm.originalEmail || '');
    this.editAdminPassword.set('');
    this.editAdminRoleId.set(adm.roleId || null);
  }

  closeEditAdminModal(): void {
    this.editingAdmin.set(null);
  }

  saveEditAdmin(): void {
    const adm = this.editingAdmin();
    if (!adm) return;

    const username = this.editAdminUsername().trim();
    let email = this.editAdminEmail().trim();
    if (email && !email.includes('@') && this.emailDomain) {
      const domain = this.emailDomain.startsWith('@') ? this.emailDomain : `@${this.emailDomain}`;
      email = `${email}${domain}`;
    }
    const originalEmail = this.editAdminOriginalEmail().trim();
    const password = this.editAdminPassword();
    const roleId = this.editAdminRoleId() ? Number(this.editAdminRoleId()) : undefined;

    this.submitEditAdmin.emit({
      adminId: adm.id,
      username,
      email,
      originalEmail: originalEmail || undefined,
      password: password || undefined,
      roleId
    });
  }

  onUsernameInput(val: string): void {
    this.newAdminUsername.set(val);
    const username = val.trim().toLowerCase().replace(/\s+/g, '.');
    if (username && this.emailDomain) {
      const domain = this.emailDomain.startsWith('@') ? this.emailDomain : `@${this.emailDomain}`;
      this.newAdminEmail.set(`${username}${domain}`);
    } else if (username) {
      this.newAdminEmail.set(username);
    }
  }

  getAdminAvatarUrl(adm: CompanyAdmin): string | null {
    if (!adm || !adm.profileImagePath) return null;
    const path = adm.profileImagePath;
    if (path.startsWith('http')) return path;
    return `${this.apiOrigin}${path}`;
  }
}
