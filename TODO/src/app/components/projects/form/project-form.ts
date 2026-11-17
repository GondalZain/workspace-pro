import { Component, computed, ElementRef, inject, input, model, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  createProjectForm,
  linkFormGroupToModels,
  projectFormValueFromRaw,
  type ProjectFormValue
} from '../../../core/forms';
import { FormFieldErrorComponent } from '../../../shared/forms';
import { CustomFieldsRendererComponent } from '../../custom-fields/custom-fields-renderer/custom-fields-renderer';
import { readImageFileAsDataUrl } from '../../../shared/utils/image-file.util';
import { resolveProjectImageUrl } from '../shared/project-image.util';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { FormTemplatesApiService } from '../../../core/api/form-templates-api.service';
import { FormCustomFieldDef, TaskFormTemplate } from '../../../models/task-form-template.model';
import { User } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/api/api.config';

export type { ProjectFormValue };

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FormFieldErrorComponent, CustomFieldsRendererComponent],
  templateUrl: './project-form.html',
  styleUrl: './project-form.css'
})
export class ProjectFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly adminApi = inject(AdminApiService);
  private readonly formTemplatesApi = inject(FormTemplatesApiService);

  readonly title = model('');
  readonly description = model('');
  /** Raw path from API, data URL after upload, or null — two-way with parent. */
  readonly imagePreview = model<string | null>(null);
  readonly defaultAssigneeId = model<number | null>(null);
  readonly formTemplateId = model<number | null>(null);
  readonly customFields = model<Record<string, any>>({});

  readonly formHeading = input('');
  readonly formSubtitle = input('');
  readonly errorMessage = input('');
  readonly submitLabel = input('Save project');
  readonly showBack = input(true);
  readonly showCancel = input(false);
  readonly isPreviewMode = input(false);
  private readonly customFieldsRenderer = viewChild(CustomFieldsRendererComponent);

  readonly submitted = output<ProjectFormValue>();
  readonly cancelled = output<void>();

  protected readonly activeTab = signal<'details' | 'configuration'>('details');
  protected readonly workspaceUsers = signal<User[]>([]);
  protected readonly isUserDropdownOpen = signal(false);
  protected readonly availableTemplates = signal<TaskFormTemplate[]>([]);

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

  protected readonly form = createProjectForm(this.fb);
  protected readonly submitAttempted = signal(false);
  protected readonly previewBroken = signal(false);

  protected readonly resolvedImagePreview = computed(() => resolveProjectImageUrl(this.imagePreview()));

  protected readonly selectedUser = computed(() => {
    const id = this.defaultAssigneeId();
    if (!id) return null;
    return this.workspaceUsers().find((u) => u.id === id) || null;
  });

  protected readonly selectedTemplate = computed(() => {
    const id = this.formTemplateId();
    if (!id) return null;
    return this.availableTemplates().find((t) => t.id === id) || null;
  });

  protected readonly templateCustomFields = computed<FormCustomFieldDef[]>(() => {
    return this.selectedTemplate()?.fieldsConfig?.customFields || [];
  });

  protected readonly customTemplates = computed(() => {
    return this.availableTemplates().filter((t) => !t.isDefault && t.name.toLowerCase() !== 'standard task form');
  });

  constructor() {
    linkFormGroupToModels(this.form, {
      title: this.title,
      description: this.description
    });

    this.adminApi.listUsers().subscribe({
      next: (users) => this.workspaceUsers.set(users),
      error: () => this.workspaceUsers.set([])
    });

    this.formTemplatesApi.list().subscribe({
      next: (templates) => this.availableTemplates.set(templates),
      error: () => this.availableTemplates.set([])
    });
  }

  protected triggerFileInput(): void {
    if (this.isPreviewMode()) return;
    this.fileInput()?.nativeElement.click();
  }

  protected onPreviewError(): void {
    this.previewBroken.set(true);
  }

  protected async onImagePicked(event: Event): Promise<void> {
    if (this.isPreviewMode()) return;
    const dataUrl = await readImageFileAsDataUrl(event);
    if (dataUrl) {
      this.previewBroken.set(false);
      this.imagePreview.set(dataUrl);
    }
  }

  protected removeImage(): void {
    if (this.isPreviewMode()) return;
    const input = this.fileInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
    this.previewBroken.set(false);
    this.imagePreview.set(null);
  }

  protected toggleUserDropdown(): void {
    this.isUserDropdownOpen.update((v) => !v);
  }

  protected selectUser(userId: number | null): void {
    this.defaultAssigneeId.set(userId);
    this.isUserDropdownOpen.set(false);
  }

  protected getUserAvatar(user: User | null): string | null {
    if (!user || !user.profileImagePath) return null;
    const path = user.profileImagePath;
    if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiOrigin}${clean}`;
  }

  protected getUserDesignation(user: User | null): string {
    if (!user) return 'Unassigned';
    switch (user.role) {
      case 'super_admin': return 'System Administrator';
      case 'admin': return 'Company Admin';
      case 'editor': return 'Project Lead / Manager';
      case 'user': return 'Software Engineer / Specialist';
      case 'viewer': return 'Viewer';
      default: return 'Team Member';
    }
  }

  protected onTemplateSelect(value: string): void {
    const num = value ? Number(value) : null;
    this.formTemplateId.set(num);
  }

  protected onTemplateFieldChange(fieldKey: string, value: any): void {
    const current = { ...(this.customFields() || {}) };
    current[fieldKey] = value;
    this.customFields.set(current);
  }

  protected submit(): void {
    if (this.isPreviewMode()) {
      return;
    }
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();
    const isCustomValid = this.customFieldsRenderer()?.validate() ?? true;
    const cf = this.customFields() || {};
    const missingRequiredTemplateField = this.templateCustomFields().some((field) => {
      if (!field.isRequired) return false;
      const val = cf[field.fieldKey] ?? field.defaultValue;
      return val === undefined || val === null || val === '';
    });
    if (this.form.invalid || !isCustomValid || missingRequiredTemplateField) {
      this.activeTab.set('details');
      return;
    }
    this.submitAttempted.set(false);
    const value = projectFormValueFromRaw(this.form.getRawValue());
    value.defaultAssigneeId = this.defaultAssigneeId();
    value.formTemplateId = this.formTemplateId();
    value.customFields = this.customFields();
    this.submitted.emit(value);
  }
}
