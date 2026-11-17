import { Component, EventEmitter, Input, Output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Permission, Role } from '../../../core/api/admin-api.service';

@Component({
  selector: 'app-admin-permissions-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-permissions-tab.html',
  styleUrl: './admin-permissions-tab.css'
})
export class AdminPermissionsTabComponent {
  @Input() availablePermissions: Permission[] = [];
  @Input() allRoles: Role[] = [];
  @Input({ required: true }) primaryColor!: string;

  @Input() editingRoleId: number | null = null;
  newRoleName = model<string>('');
  newRoleDescription = model<string>('');

  @Input() newRolePermissions: Set<string> = new Set();
  @Input() isCreatingRole: boolean = false;
  @Input() roleSuccess: string | null = null;
  @Input() roleError: string | null = null;

  @Output() toggleNewRolePermission = new EventEmitter<string>();
  @Output() editRole = new EventEmitter<Role>();
  @Output() deleteRole = new EventEmitter<Role>();
  @Output() resetRoleForm = new EventEmitter<void>();
  @Output() saveRole = new EventEmitter<void>();

  hasNewRolePermission(permName: string): boolean {
    return this.newRolePermissions.has(permName);
  }
}
