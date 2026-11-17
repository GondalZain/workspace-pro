import { Component, inject, input, model, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Permission, Role } from '../../core/api/admin-api.service';
import { createRoleForm, patchRoleForm, roleFormValueFromRaw } from '../../core/forms';
import { FormFieldErrorComponent } from '../../shared/forms';

export interface RoleChange { roleId: number; name: string; description: string; permissions: string[]; }

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldErrorComponent],
  templateUrl: './admin-roles.html',
  styleUrl: './admin-roles.css'
})
export class AdminRolesComponent {
  readonly roles = input.required<Role[]>();
  readonly permissions = input.required<Permission[]>();
  readonly showCreateForm = model(false);

  readonly roleCreated = output<RoleChange>();
  readonly roleUpdated = output<RoleChange>();
  readonly roleDeleted = output<number>();

  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly editingRoleId = signal<number | null>(null);
  protected readonly editForm = createRoleForm(this.fb);
  protected readonly createForm = createRoleForm(this.fb);
  protected readonly editSubmitAttempted = signal(false);
  protected readonly createSubmitAttempted = signal(false);

  protected beginEdit(role: Role): void {
    this.editingRoleId.set(role.id);
    patchRoleForm(this.editForm, {
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
  }

  protected toggleEditPermission(permission: string, checked: boolean): void {
    const current = this.editForm.controls.permissions.value;
    const next = checked ? [...current, permission] : current.filter((item) => item !== permission);
    this.editForm.controls.permissions.setValue(next);
  }

  protected toggleNewPermission(permission: string, checked: boolean): void {
    const current = this.createForm.controls.permissions.value;
    const next = checked ? [...current, permission] : current.filter((item) => item !== permission);
    this.createForm.controls.permissions.setValue(next);
  }

  protected saveRole(role: Role): void {
    this.editSubmitAttempted.set(true);
    this.editForm.markAllAsTouched();
    if (this.editForm.invalid) {
      return;
    }
    this.editSubmitAttempted.set(false);

    const value = roleFormValueFromRaw(this.editForm.getRawValue());
    this.roleUpdated.emit({
      roleId: role.id,
      name: value.name,
      description: value.description,
      permissions: value.permissions
    });
    this.editingRoleId.set(null);
  }

  protected createRole(): void {
    this.createSubmitAttempted.set(true);
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) {
      return;
    }
    this.createSubmitAttempted.set(false);

    const value = roleFormValueFromRaw(this.createForm.getRawValue());
    this.roleCreated.emit({
      roleId: 0,
      name: value.name,
      description: value.description,
      permissions: value.permissions
    });
    this.createForm.reset({ name: '', description: '', permissions: [] });
    this.showCreateForm.set(false);
  }

  protected deleteRole(role: Role): void {
    this.roleDeleted.emit(role.id);
  }
}
