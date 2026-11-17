import { Component, OnInit, OnDestroy, computed, inject, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CustomFieldsApiService } from '../../../core/api/custom-fields-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CustomFieldDefinition,
  CustomFieldEntityType,
  CustomFieldType
} from '../../../models/custom-field.model';

@Component({
  selector: 'app-custom-fields-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-fields-renderer.html',
  styleUrl: './custom-fields-renderer.css'
})
export class CustomFieldsRendererComponent implements OnInit, OnDestroy {
  private readonly customFieldsApi = inject(CustomFieldsApiService);
  private readonly auth = inject(AuthService);
  private refreshSub?: Subscription;

  readonly entityType = input.required<CustomFieldEntityType>();
  readonly values = model<Record<string, any>>({});
  readonly isPreviewMode = input<boolean>(false);
  readonly submitAttempted = input<boolean>(false);

  readonly fields = signal<CustomFieldDefinition[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  // Check if current user is admin/super_admin to allow inline field creation
  readonly isAdmin = computed(() => {
    const user = this.auth.getUser();
    return user?.role === 'admin' || user?.role === 'super_admin';
  });

  // Inline Quick Add & Edit Field Form
  readonly isQuickAddOpen = signal(false);
  readonly editingField = signal<CustomFieldDefinition | null>(null);
  newFieldName = '';
  newFieldType: CustomFieldType = 'text';
  newFieldPlaceholder = '';
  newFieldIsRequired = false;
  newFieldOptions: string[] = [];
  newOptionText = '';

  ngOnInit(): void {
    this.loadDefinitions();
    this.refreshSub = this.customFieldsApi.refresh$.subscribe(() => {
      this.loadDefinitions();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadDefinitions(): void {
    this.isLoading.set(true);
    this.customFieldsApi.getFields(this.entityType()).subscribe({
      next: (defs) => {
        this.fields.set(defs);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onValueChange(key: string, val: any): void {
    const current = { ...(this.values() || {}) };
    current[key] = val;
    this.values.set(current);
  }

  toggleQuickAdd(): void {
    if (this.isQuickAddOpen()) {
      this.cancelQuickAdd();
    } else {
      this.startAddNewField();
    }
  }

  startAddNewField(): void {
    this.resetQuickAddForm();
    this.isQuickAddOpen.set(true);
  }

  cancelQuickAdd(): void {
    this.resetQuickAddForm();
    this.isQuickAddOpen.set(false);
  }

  isFieldInvalid(field: CustomFieldDefinition): boolean {
    if (!this.submitAttempted() || !field.isRequired) return false;
    if (field.fieldType === 'checkbox') return false;
    const val = this.values()?.[field.fieldKey];
    return val === undefined || val === null || String(val).trim() === '';
  }

  validate(): boolean {
    const vals = this.values() || {};
    for (const f of this.fields()) {
      if (f.isRequired && f.fieldType !== 'checkbox') {
        const v = vals[f.fieldKey];
        if (v === undefined || v === null || String(v).trim() === '') {
          return false;
        }
      }
    }
    return true;
  }

  editFieldInline(field: CustomFieldDefinition): void {
    this.editingField.set(field);
    this.newFieldName = field.fieldName;
    this.newFieldType = field.fieldType;
    this.newFieldPlaceholder = field.placeholder || '';
    this.newFieldIsRequired = field.isRequired;
    this.newFieldOptions = [...field.options];
    this.isQuickAddOpen.set(true);
  }

  deleteFieldInline(field: CustomFieldDefinition): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete the field "${field.fieldName}"?\n\n` +
      `✓ Data Safety Guarantee: All existing ${this.entityType()} records will keep their saved data safely without any loss. This field will simply be removed from future new forms.`
    );
    if (!confirmed) return;

    if (this.editingField()?.id === field.id) {
      this.resetQuickAddForm();
      this.isQuickAddOpen.set(false);
    }

    this.customFieldsApi.deleteField(field.id).subscribe({
      next: () => {
        // Definitions will auto-reload via API refresh$
      },
      error: (err) => {
        alert(err?.error?.error || 'Failed to delete field.');
      }
    });
  }

  resetQuickAddForm(): void {
    this.editingField.set(null);
    this.newFieldName = '';
    this.newFieldType = 'text';
    this.newFieldPlaceholder = '';
    this.newFieldIsRequired = false;
    this.newFieldOptions = [];
    this.newOptionText = '';
  }

  addDropdownOption(): void {
    const opt = this.newOptionText.trim();
    if (opt && !this.newFieldOptions.includes(opt)) {
      this.newFieldOptions.push(opt);
      this.newOptionText = '';
    }
  }

  removeDropdownOption(idx: number): void {
    this.newFieldOptions.splice(idx, 1);
  }

  saveQuickField(): void {
    if (!this.newFieldName.trim()) return;

    this.isSaving.set(true);
    const editing = this.editingField();

    if (editing) {
      this.customFieldsApi.updateField(editing.id, {
        fieldName: this.newFieldName.trim(),
        fieldType: this.newFieldType,
        placeholder: this.newFieldPlaceholder.trim(),
        isRequired: this.newFieldIsRequired,
        options: this.newFieldType === 'dropdown' ? this.newFieldOptions : []
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isQuickAddOpen.set(false);
          this.resetQuickAddForm();
        },
        error: (err) => {
          this.isSaving.set(false);
          alert(err?.error?.error || 'Failed to update custom field.');
        }
      });
    } else {
      this.customFieldsApi.createField({
        entityType: this.entityType(),
        fieldName: this.newFieldName.trim(),
        fieldType: this.newFieldType,
        placeholder: this.newFieldPlaceholder.trim(),
        isRequired: this.newFieldIsRequired,
        options: this.newFieldType === 'dropdown' ? this.newFieldOptions : []
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isQuickAddOpen.set(false);
          this.resetQuickAddForm();
        },
        error: (err) => {
          this.isSaving.set(false);
          alert(err?.error?.error || 'Failed to create custom field.');
        }
      });
    }
  }
}

