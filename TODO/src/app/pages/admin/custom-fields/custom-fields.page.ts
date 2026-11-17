import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CustomFieldsApiService } from '../../../core/api/custom-fields-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ProjectFormComponent } from '../../../components/projects/form/project-form';
import { TaskEditorComponent } from '../../../components/task-editor/task-editor';
import {
  CustomFieldDefinition,
  CustomFieldEntityType,
  CustomFieldType
} from '../../../models/custom-field.model';

export type CustomFieldsTab = 'task' | 'project' | 'table';

@Component({
  selector: 'app-admin-custom-fields-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectFormComponent, TaskEditorComponent],
  templateUrl: './custom-fields.page.html',
  styleUrl: './custom-fields.page.css'
})
export class AdminCustomFieldsPage implements OnInit, OnDestroy {
  private readonly customFieldsApi = inject(CustomFieldsApiService);
  private readonly authService = inject(AuthService);
  private refreshSub?: Subscription;

  readonly currentUser = signal(this.authService.getUser());
  readonly currentCompany = computed(() => this.currentUser()?.company || null);

  readonly activeTab = signal<CustomFieldsTab>('task');
  readonly tableFilter = signal<'all' | 'task' | 'project'>('all');
  readonly allFields = signal<CustomFieldDefinition[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  // Live preview form values
  readonly taskPreviewValues = signal<Record<string, any>>({});
  readonly projectPreviewValues = signal<Record<string, any>>({});

  // Modal State
  readonly isModalOpen = signal(false);
  readonly editingField = signal<CustomFieldDefinition | null>(null);

  modalEntity: CustomFieldEntityType = 'task';
  modalFieldName = '';
  modalFieldKey = '';
  modalFieldType: CustomFieldType = 'text';
  modalPlaceholder = '';
  modalDescription = '';
  modalIsRequired = false;
  modalOptions: string[] = [];
  newOptionInput = '';

  readonly taskFields = computed(() =>
    this.allFields().filter((f) => f.entityType === 'task')
  );

  readonly projectFields = computed(() =>
    this.allFields().filter((f) => f.entityType === 'project')
  );

  readonly filteredTableFields = computed(() => {
    const f = this.tableFilter();
    if (f === 'task') return this.taskFields();
    if (f === 'project') return this.projectFields();
    return this.allFields();
  });

  ngOnInit(): void {
    this.loadFields();
    this.refreshSub = this.customFieldsApi.refresh$.subscribe(() => {
      this.loadFields();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadFields(): void {
    this.isLoading.set(true);
    this.customFieldsApi.getFields().subscribe({
      next: (fields) => {
        this.allFields.set(fields);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Failed to load custom fields.');
        this.isLoading.set(false);
      }
    });
  }

  setActiveTab(tab: CustomFieldsTab): void {
    this.activeTab.set(tab);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  openCreateModal(targetEntity?: CustomFieldEntityType): void {
    this.editingField.set(null);
    if (targetEntity) {
      this.modalEntity = targetEntity;
    } else {
      this.modalEntity = this.activeTab() === 'project' ? 'project' : 'task';
    }
    this.modalFieldName = '';
    this.modalFieldKey = '';
    this.modalFieldType = 'text';
    this.modalPlaceholder = '';
    this.modalDescription = '';
    this.modalIsRequired = false;
    this.modalOptions = [];
    this.newOptionInput = '';
    this.isModalOpen.set(true);
  }

  openEditModal(field: CustomFieldDefinition): void {
    this.editingField.set(field);
    this.modalEntity = field.entityType;
    this.modalFieldName = field.fieldName;
    this.modalFieldKey = field.fieldKey;
    this.modalFieldType = field.fieldType;
    this.modalPlaceholder = field.placeholder || '';
    this.modalDescription = field.description || '';
    this.modalIsRequired = field.isRequired;
    this.modalOptions = [...field.options];
    this.newOptionInput = '';
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingField.set(null);
  }

  onFieldNameChange(name: string): void {
    if (!this.editingField()) {
      this.modalFieldKey = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
  }

  addOption(): void {
    const val = this.newOptionInput.trim();
    if (val && !this.modalOptions.includes(val)) {
      this.modalOptions.push(val);
      this.newOptionInput = '';
    }
  }

  removeOption(index: number): void {
    this.modalOptions.splice(index, 1);
  }

  saveField(): void {
    if (!this.modalFieldName.trim()) return;

    this.isSaving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const editing = this.editingField();

    if (editing) {
      this.customFieldsApi.updateField(editing.id, {
        fieldName: this.modalFieldName.trim(),
        fieldType: this.modalFieldType,
        placeholder: this.modalPlaceholder.trim(),
        description: this.modalDescription.trim(),
        isRequired: this.modalIsRequired,
        options: this.modalFieldType === 'dropdown' ? this.modalOptions : []
      }).subscribe({
        next: (updated) => {
          this.allFields.update((prev) =>
            prev.map((f) => (f.id === updated.id ? updated : f))
          );
          this.isSaving.set(false);
          this.closeModal();
          this.successMessage.set(`Custom field "${updated.fieldName}" updated successfully.`);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.error || 'Failed to update custom field.');
        }
      });
    } else {
      this.customFieldsApi.createField({
        entityType: this.modalEntity,
        fieldName: this.modalFieldName.trim(),
        fieldKey: this.modalFieldKey.trim(),
        fieldType: this.modalFieldType,
        placeholder: this.modalPlaceholder.trim(),
        description: this.modalDescription.trim(),
        isRequired: this.modalIsRequired,
        options: this.modalFieldType === 'dropdown' ? this.modalOptions : []
      }).subscribe({
        next: (created) => {
          this.allFields.update((prev) => [...prev, created]);
          this.isSaving.set(false);
          this.closeModal();
          this.successMessage.set(`Custom field "${created.fieldName}" created successfully.`);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.error || 'Failed to create custom field.');
        }
      });
    }
  }

  deleteField(field: CustomFieldDefinition): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete the custom field "${field.fieldName}"?\n\n` +
      `✓ ZERO DATA LOSS GUARANTEE:\nAll existing tasks and projects that already have saved values for "${field.fieldName}" will retain 100% of their data safely. This field will simply be removed from future new forms.`
    );
    if (!confirmed) return;

    this.customFieldsApi.deleteField(field.id).subscribe({
      next: () => {
        this.allFields.update((prev) => prev.filter((f) => f.id !== field.id));
        this.successMessage.set(`Field "${field.fieldName}" deleted. Existing task/project records retain all saved data safely.`);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Failed to delete field.');
      }
    });
  }
}

