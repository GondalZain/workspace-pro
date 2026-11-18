// @ts-nocheck
import { Component, computed, effect, inject, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NewTask, Task, TaskAttachment } from '../../models/task.model';
import {
  createTaskEditorForm,
  patchTaskEditorForm,
  taskEditorFormToNewTask
} from '../../core/forms';
import { ProjectStoreService } from '../../services/project-store.service';
import { TaskStoreService } from '../../services/task-store.service';
import { FormFieldErrorComponent } from '../../shared/forms';
import { UserAssigneePickerComponent } from '../user-assignee-picker/user-assignee-picker';
import { FileAttachmentUploaderComponent } from '../file-attachment-uploader/file-attachment-uploader';
import { FormTemplatesApiService } from '../../core/api/form-templates-api.service';
import {
  DEFAULT_STANDARD_FIELDS_CONFIG,
  FormCustomFieldDef,
  StandardFieldsConfig,
  TaskFormTemplate
} from '../../models/task-form-template.model';

@Component({
  selector: 'app-task-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    UserAssigneePickerComponent,
    FileAttachmentUploaderComponent
  ],
  templateUrl: './task-editor.html',
  styleUrl: './task-editor.css'
})
export class TaskEditorComponent implements OnInit {
  readonly task = input<Task | null>(null);
  readonly initialProjectId = input<number | null>(null);
  readonly backLabel = input<string>('Back');
  readonly showWayfinding = input(true);
  readonly isPreviewMode = input(false);
  readonly saved = output<NewTask>();
  readonly cancelled = output<void>();

  private readonly projectStore = inject(ProjectStoreService);
  private readonly taskStore = inject(TaskStoreService);
  private readonly formTemplatesApi = inject(FormTemplatesApiService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = createTaskEditorForm(this.fb);
  protected readonly submitAttempted = signal(false);
  protected readonly attachments = signal<TaskAttachment[]>([]);
  protected readonly customFields = signal<Record<string, any>>({});
  protected readonly projectOptions = this.projectStore.projects;

  // Form templates state
  protected readonly availableTemplates = signal<TaskFormTemplate[]>([]);
  protected readonly selectedTemplateId = signal<number | null>(null);
  protected readonly selectedTemplate = computed(() => {
    const list = this.availableTemplates();
    const id = this.selectedTemplateId();
    if (id != null) {
      const match = list.find((t) => t.id === id);
      if (match) return match;
    }
    const def = list.find((t) => t.isDefault);
    return def || null;
  });

  // Effective layout configs based on selected form template
  protected readonly standardFields = computed<StandardFieldsConfig>(() => {
    const tmpl = this.selectedTemplate();
    return tmpl?.fieldsConfig?.standardFields || DEFAULT_STANDARD_FIELDS_CONFIG;
  });

  protected readonly templateCustomFields = computed<FormCustomFieldDef[]>(() => {
    const tmpl = this.selectedTemplate();
    return tmpl?.fieldsConfig?.customFields || [];
  });

  protected readonly statusOptions = computed(() => {
    const list = this.taskStore.taskStatuses();
    if (list && list.length > 0) return list;
    return [
      { id: 1, name: 'Pending', slug: 'pending', color: '#dc2626' },
      { id: 2, name: 'In Progress', slug: 'in-progress', color: '#2563eb' },
      { id: 3, name: 'Completed', slug: 'completed', color: '#16a34a' }
    ];
  });

  ngOnInit(): void {
    this.loadFormTemplates();
  }

  private loadFormTemplates(): void {
    this.formTemplatesApi.list().subscribe({
      next: (list) => {
        this.availableTemplates.set(list);

        // Pre-select template strictly from the task itself (never inherit from project or fall back to list[0])
        const currentTask = this.task();
        if (currentTask?.formTemplateId) {
          this.selectedTemplateId.set(currentTask.formTemplateId);
        } else {
          const def = list.find((t) => t.isDefault) || null;
          this.selectedTemplateId.set(def ? def.id : null);
          this.form.controls.formTemplateId.setValue(def ? def.id : null);
        }
      },
      error: (err) => console.warn('Could not load task form templates:', err)
    });
  }

  protected onTemplateChange(templateIdStr: string): void {
    const id = Number(templateIdStr);
    if (!isNaN(id)) {
      this.selectedTemplateId.set(id);
      this.form.controls.formTemplateId.setValue(id);
    }
  }

  protected onAssigneeIdsChange(ids: number[]): void {
    this.form.controls.assigneeIds.setValue(ids);
  }

  protected onProjectChange(): void {
    const selectedProjectId = this.form.controls.projectId.value;
    if (!selectedProjectId) {
      this.form.controls.assigneeIds.setValue([]);
      return;
    }
    const project = this.projectOptions().find((p) => p.id === Number(selectedProjectId));
    if (project) {
      if (project.defaultAssigneeId) {
        this.form.controls.assigneeIds.setValue([project.defaultAssigneeId]);
      } else {
        this.form.controls.assigneeIds.setValue([]);
      }
    }
  }

  protected onAttachmentsChange(updated: TaskAttachment[]): void {
    this.attachments.set(updated);
  }

  protected onCustomFieldChange(fieldKey: string, value: any): void {
    this.customFields.update((prev) => ({
      ...prev,
      [fieldKey]: value
    }));
  }

  protected parsedTags(): string[] {
    return this.form.controls.tags.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  constructor() {
    this.projectStore.refresh();

    effect(() => {
      const currentTask = this.task();
      const defaultProjectId = currentTask ? null : this.initialProjectId();
      patchTaskEditorForm(this.form, currentTask, { defaultProjectId });
      this.attachments.set(currentTask?.attachments ?? []);
      this.customFields.set(currentTask?.customFields ?? {});

      if (currentTask?.formTemplateId) {
        this.selectedTemplateId.set(currentTask.formTemplateId);
      } else {
        const def = this.availableTemplates().find((t) => t.isDefault) || null;
        this.selectedTemplateId.set(def ? def.id : null);
      }

      if (!currentTask) {
        if (!this.form.controls.projectId.value) {
          const fallbackProjectId = defaultProjectId
            ?? this.projectStore.activeProjectId()
            ?? (this.projectOptions().length === 1 ? this.projectOptions()[0].id : null);
          if (fallbackProjectId) {
            this.form.controls.projectId.setValue(fallbackProjectId);
          }
        }
        const activeProjectId = this.form.controls.projectId.value || defaultProjectId;
        if (activeProjectId) {
          const project = this.projectOptions().find((p) => p.id === Number(activeProjectId));
          if (project?.defaultAssigneeId && (!this.form.controls.assigneeIds.value || this.form.controls.assigneeIds.value.length === 0)) {
            this.form.controls.assigneeIds.setValue([project.defaultAssigneeId]);
          }
        }
      }
    }, { allowSignalWrites: true });
  }

  private validateCustomFields(): boolean {
    const fields = this.templateCustomFields();
    const values = this.customFields();

    for (const f of fields) {
      if (f.isRequired) {
        const val = values[f.fieldKey];
        if (val === undefined || val === null || val === '') {
          return false;
        }
      }
    }
    return true;
  }

  private validateTemplateStandardFields(): boolean {
    const sf = this.standardFields();
    const raw = this.form.getRawValue();

    if (sf.description?.enabled && sf.description?.required && !raw.description?.trim()) {
      return false;
    }
    if (sf.dueDate?.enabled && sf.dueDate?.required && !raw.dueDate) {
      return false;
    }
    if (sf.assignees?.enabled && sf.assignees?.required && (!raw.assigneeIds || raw.assigneeIds.length === 0)) {
      return false;
    }
    if (sf.category?.enabled && sf.category?.required && !raw.category?.trim()) {
      return false;
    }
    if (sf.priority?.enabled && sf.priority?.required && !raw.priority) {
      return false;
    }
    return true;
  }

  protected save(): void {
    if (this.isPreviewMode()) {
      return;
    }
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();

    const isCustomValid = this.validateCustomFields();
    const isStandardValid = this.validateTemplateStandardFields();
    if (this.form.invalid || !isCustomValid || !isStandardValid) {
      return;
    }

    this.submitAttempted.set(false);
    const newTask = taskEditorFormToNewTask(this.form.getRawValue(), this.attachments());
    newTask.customFields = this.customFields();
    newTask.formTemplateId = this.selectedTemplateId();
    this.saved.emit(newTask);
  }
}
