import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../../../models/project.model';
import { Task, TaskStatus } from '../../../models/task.model';
import { ProjectImagePipe } from '../shared/project-image.pipe';
import { TaskListComponent } from '../../task-list/task-list';
import { CustomFieldsApiService } from '../../../core/api/custom-fields-api.service';
import { CustomFieldDefinition } from '../../../models/custom-field.model';
import { FormTemplatesApiService } from '../../../core/api/form-templates-api.service';
import { TaskFormTemplate } from '../../../models/task-form-template.model';
import { ProjectTeamReadinessComponent } from '../team-readiness/project-team-readiness.component';

@Component({
  selector: 'app-project-detail-view',
  standalone: true,
  imports: [CommonModule, ProjectImagePipe, TaskListComponent, ProjectTeamReadinessComponent],
  templateUrl: './project-detail-view.html',
  styleUrls: ['./project-detail-view.css', '../shared/projects-ui.css']
})
export class ProjectDetailViewComponent {
  readonly project = input<Project | null>(null);
  readonly tasks = input<Task[]>([]);
  readonly currentUserId = input<number | null | undefined>(null);
  readonly currentUsername = input<string | null | undefined>(null);
  readonly isAdmin = input(false);

  readonly newTask = output<void>();
  readonly taskSelected = output<Task>();
  readonly taskToggled = output<number>();
  readonly taskDeleted = output<number>();
  readonly taskEdited = output<Task>();
  readonly taskStatusChanged = output<{ id: number; status: TaskStatus }>();
  readonly projectRefreshed = output<void>();

  protected readonly activeTab = signal<'tasks' | 'readiness'>('tasks');

  private readonly customFieldsApi = inject(CustomFieldsApiService);
  private readonly formTemplatesApi = inject(FormTemplatesApiService);
  protected readonly fieldDefinitions = signal<CustomFieldDefinition[]>([]);
  protected readonly availableTemplates = signal<TaskFormTemplate[]>([]);

  constructor() {
    this.customFieldsApi.getFields('project', true).subscribe({
      next: (defs) => this.fieldDefinitions.set(defs),
      error: () => {}
    });
    this.formTemplatesApi.list().subscribe({
      next: (templates) => this.availableTemplates.set(templates),
      error: () => {}
    });
  }

  readonly assignedTemplate = computed<TaskFormTemplate | null>(() => {
    const proj = this.project();
    if (!proj?.formTemplateId) return null;
    return this.availableTemplates().find((t) => t.id === Number(proj.formTemplateId)) || null;
  });

  readonly sectionTitle = computed<string>(() => {
    return this.assignedTemplate()?.fieldsConfig?.sectionTitle?.trim() || '';
  });

  readonly customFieldItems = computed(() => {
    const raw = this.project()?.customFields;
    if (!raw || typeof raw !== 'object') return [];
    const defs = this.fieldDefinitions();

    type FieldMeta = {
      fieldName: string;
      fieldType: string;
      bsCol?: string;
      columnWidth?: string;
      fieldSize?: string;
    };

    const defMap = new Map<string, FieldMeta>(
      defs.map((d) => [d.fieldKey, { fieldName: d.fieldName, fieldType: d.fieldType }])
    );
    const tmplFields = this.assignedTemplate()?.fieldsConfig?.customFields || [];
    for (const tf of tmplFields) {
      defMap.set(tf.fieldKey, {
        fieldName: tf.fieldName,
        fieldType: tf.fieldType,
        bsCol: tf.bsCol,
        columnWidth: tf.columnWidth,
        fieldSize: tf.fieldSize
      });
    }

    const orderedKeys = [
      ...tmplFields.map((t) => t.fieldKey),
      ...Object.keys(raw).filter((k) => !tmplFields.some((t) => t.fieldKey === k))
    ];

    return orderedKeys
      .filter((key) => raw[key] !== null && raw[key] !== undefined && raw[key] !== '')
      .map((key) => {
        const value = raw[key];
        const def = defMap.get(key);
        let formattedValue = value;
        if (def?.fieldType === 'checkbox') {
          formattedValue = value === true || value === 'true' || value === 1 ? 'Yes' : 'No';
        }
        return {
          key,
          label: def?.fieldName || this.formatFallbackLabel(key),
          value: formattedValue,
          type: def?.fieldType || 'text',
          bsCol: def?.bsCol,
          columnWidth: def?.columnWidth,
          fieldSize: def?.fieldSize
        };
      });
  });

  private formatFallbackLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  getCustomFieldEntries(customFields?: Record<string, any>): { key: string; value: any }[] {
    if (!customFields || typeof customFields !== 'object') return [];
    return Object.entries(customFields)
      .filter(([_, val]) => val !== null && val !== undefined && val !== '')
      .map(([key, value]) => ({ key, value }));
  }
}
