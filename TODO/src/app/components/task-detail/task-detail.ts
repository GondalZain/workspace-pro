import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatEstimatedMinutes, formatSpentMinutes, parseTimeToMinutes, Task, TaskStatus, TaskStatusItem, UserSummary } from '../../models/task.model';
import { NewTimesheetEntry, TimesheetEntry } from '../../models/timesheet.model';
import { API_BASE_URL } from '../../core/api/api.config';
import { TaskNotesComponent } from '../task-notes/task-notes';
import { TimesheetFormComponent, TimesheetTableComponent } from '../timesheet';
import { AuthService } from '../../core/auth/auth.service';
import { AdminApiService } from '../../core/api/admin-api.service';
import { TaskStoreService } from '../../services/task-store.service';
import { ProjectStoreService } from '../../services/project-store.service';
import { TimesheetStoreService } from '../../services/timesheet-store.service';
import { SubscriptionService } from '../../core/subscription/subscription.service';
import { CustomFieldsApiService } from '../../core/api/custom-fields-api.service';
import { CustomFieldDefinition } from '../../models/custom-field.model';
import { FormTemplatesApiService } from '../../core/api/form-templates-api.service';
import {
  DEFAULT_STANDARD_FIELDS_CONFIG,
  StandardFieldsConfig,
  TaskFormTemplate
} from '../../models/task-form-template.model';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule,
    TaskNotesComponent,
    TimesheetFormComponent,
    TimesheetTableComponent
  ],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.css'
})
export class TaskDetailComponent {
  readonly task = input.required<Task>();
  /** When false, page-level breadcrumb/nav handles wayfinding. */
  readonly showWayfinding = input(true);
  readonly close = output<void>();
  readonly edit = output<void>();
  protected readonly selectedImage = signal<string | null>(null);
  private readonly uploadBaseUrl = API_BASE_URL.replace(/\/api$/, '');
  private readonly auth = inject(AuthService);
  private readonly adminApi = inject(AdminApiService);
  private readonly taskStore = inject(TaskStoreService);
  private readonly projectStore = inject(ProjectStoreService);
  private readonly timesheetStore = inject(TimesheetStoreService);
  private readonly subService = inject(SubscriptionService);
  private readonly customFieldsApi = inject(CustomFieldsApiService);
  private readonly formTemplatesApi = inject(FormTemplatesApiService);
  protected readonly fieldDefinitions = signal<CustomFieldDefinition[]>([]);
  protected readonly availableTemplates = signal<TaskFormTemplate[]>([]);

  protected readonly activeTemplate = computed<TaskFormTemplate | null>(() => {
    const t = this.task();
    const list = this.availableTemplates();
    if (!t || list.length === 0) return null;

    if (t.formTemplateId) {
      const match = list.find((item) => item.id === Number(t.formTemplateId));
      if (match) return match;
    }

    return list.find((item) => item.isDefault) || null;
  });

  protected readonly standardFields = computed<StandardFieldsConfig>(() => {
    const tmpl = this.activeTemplate();
    return tmpl?.fieldsConfig?.standardFields || DEFAULT_STANDARD_FIELDS_CONFIG;
  });

  protected readonly sectionTitle = computed<string>(() => {
    return this.activeTemplate()?.fieldsConfig?.sectionTitle?.trim() || '';
  });

  protected readonly customFieldItems = computed(() => {
    const raw = this.task()?.customFields;
    if (!raw || typeof raw !== 'object') return [];
    const defs = this.fieldDefinitions();
    const tmplCustom = this.activeTemplate()?.fieldsConfig?.customFields || [];

    type FieldMeta = {
      fieldName: string;
      fieldType: string;
      bsCol?: string;
      columnWidth?: string;
      fieldSize?: string;
    };

    const defMap = new Map<string, FieldMeta>();
    for (const d of defs) {
      defMap.set(d.fieldKey, { fieldName: d.fieldName, fieldType: d.fieldType });
    }
    for (const t of tmplCustom) {
      defMap.set(t.fieldKey, {
        fieldName: t.fieldName,
        fieldType: t.fieldType,
        bsCol: t.bsCol,
        columnWidth: t.columnWidth,
        fieldSize: t.fieldSize
      });
    }

    const orderedKeys = [
      ...tmplCustom.map((t) => t.fieldKey),
      ...Object.keys(raw).filter((k) => !tmplCustom.some((t) => t.fieldKey === k))
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

  readonly canLogTime = computed(() => this.subService.hasFeature('timesheet.logging'));

  openUpgradeModal(): void {
    this.subService.openModal('timesheet.logging');
  }

  protected readonly currentUser = signal(this.auth.getUser());
  protected readonly companyUsers = signal<any[]>([]);

  protected readonly creatorUser = computed<UserSummary | null>(() => {
    const t = this.task();
    if (t.creator) return t.creator;
    if (t.userId) {
      const match = this.companyUsers().find((u) => Number(u.id) === Number(t.userId));
      if (match) return match;
    }
    const curr = this.currentUser();
    if (curr && Number(curr.id) === Number(t.userId)) return curr;
    return {
      id: Number(t.userId || 0),
      username: t.creatorUsername || 'System',
      role: 'Admin'
    };
  });

  protected readonly assignedUsers = computed<UserSummary[]>(() => {
    const t = this.task();
    if (Array.isArray(t.assignees) && t.assignees.length > 0) {
      return t.assignees;
    }
    const ids = t.assigneeIds || [];
    if (ids.length === 0) return [];

    const matched = this.companyUsers().filter((u) => ids.includes(Number(u.id)));
    if (matched.length > 0) return matched;

    return ids.map((id) => {
      const curr = this.currentUser();
      if (curr && Number(curr.id) === Number(id)) return curr;
      return {
        id: Number(id),
        username: `User #${id}`,
        role: 'Member'
      };
    });
  });

  protected getInitials(name?: string | null): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  protected getAvatarUrl(path?: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/')) return `${this.uploadBaseUrl}${path}`;
    return `${this.uploadBaseUrl}/${path}`;
  }

  protected getUserColor(id: number): string {
    const colors = ['#e11d48', '#2563eb', '#7c3aed', '#059669', '#d97706', '#0891b2', '#4f46e5', '#db2777'];
    return colors[Math.abs(id) % colors.length];
  }

  protected readonly estimatedDurationLabel = computed(() =>
    formatEstimatedMinutes(this.task().estimatedMinutes)
  );

  protected readonly spentDurationLabel = computed(() => {
    const t = this.task();
    let minutes = t.spentMinutes || 0;
    const entries = this.timesheetStore.entries();
    if (entries.length > 0 && t.title) {
      const taskTitleClean = t.title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (taskTitleClean) {
        for (const entry of entries) {
          if (!entry.task) continue;
          const rawEntryTask = entry.task.trim().toLowerCase();
          if (!rawEntryTask || rawEntryTask === '-' || rawEntryTask === 'none' || rawEntryTask === 'no task') {
            continue;
          }
          const entryTaskClean = rawEntryTask.replace(/[^a-z0-9]/g, '');
          if (!entryTaskClean) continue;

          if (
            entryTaskClean === taskTitleClean ||
            (entryTaskClean.length >= 8 && taskTitleClean.startsWith(entryTaskClean)) ||
            (taskTitleClean.length >= 8 && entryTaskClean.startsWith(taskTitleClean))
          ) {
            minutes += parseTimeToMinutes(entry.time);
          }
        }
      }
    }
    return minutes > 0 ? formatSpentMinutes(minutes) : '0m';
  });

  protected readonly taskTimesheetEntries = computed(() => {
    const t = this.task();
    if (!t || !t.title) return [];
    const taskTitleClean = t.title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!taskTitleClean) return [];

    return this.timesheetStore.entries().filter((entry) => {
      if (!entry.task) return false;
      const rawEntryTask = entry.task.trim().toLowerCase();
      if (!rawEntryTask || rawEntryTask === '-' || rawEntryTask === 'none' || rawEntryTask === 'no task') {
        return false;
      }
      const entryTaskClean = rawEntryTask.replace(/[^a-z0-9]/g, '');
      if (!entryTaskClean) return false;

      return (
        entryTaskClean === taskTitleClean ||
        (entryTaskClean.length >= 8 && taskTitleClean.startsWith(entryTaskClean)) ||
        (taskTitleClean.length >= 8 && entryTaskClean.startsWith(taskTitleClean))
      );
    });
  });

  protected readonly availableStatuses = computed(() => this.taskStore.taskStatuses());

  protected readonly statusLabel = computed(() => {
    const t = this.task();
    const statuses = this.availableStatuses();
    if (t.statusId != null) {
      const byId = statuses.find((s) => s.id === t.statusId);
      if (byId) return byId.name;
    }
    const currentStatus = t.status || (t.completed ? 'completed' : 'pending');
    const matched = statuses.find((s) => s.name === currentStatus || s.slug === currentStatus);
    if (matched) return matched.name;
    if (t.statusName) return t.statusName;
    if (t.status) return t.status;
    if (t.completed || t.status === 'completed') return 'Completed';
    return 'To do';
  });


  protected readonly projectTitle = computed(() => {
    const projectId = this.task().projectId;
    if (projectId == null) return '—';
    const project = this.projectStore.projects().find((p) => p.id === projectId);
    return project?.title ?? `Project #${projectId}`;
  });

  constructor() {
    if (this.projectStore.projects().length === 0) {
      this.projectStore.refresh();
    }
    this.adminApi.listUsers().subscribe({
      next: (users) => this.companyUsers.set(users),
      error: () => this.companyUsers.set([])
    });
    this.customFieldsApi.getFields('task', true).subscribe({
      next: (defs) => this.fieldDefinitions.set(defs),
      error: () => {}
    });
    this.formTemplatesApi.list().subscribe({
      next: (list) => this.availableTemplates.set(list),
      error: () => this.availableTemplates.set([])
    });
  }
  protected readonly isAdmin = computed(() => this.currentUser()?.permissions?.includes('users.manage') === true);

  protected readonly isOwner = computed(() => {
    if (this.isAdmin()) return true;
    const user = this.currentUser();
    const t = this.task();
    if (!user || !t) return false;
    return (user.id != null && Number(t.userId) === Number(user.id)) ||
           (Boolean(user.username) && Boolean(t.creatorUsername) && t.creatorUsername === user.username) ||
           (user.id != null && Array.isArray(t.assigneeIds) && t.assigneeIds.includes(Number(user.id)));
  });

  protected setStatus(st: TaskStatusItem): void {
    if (!this.isOwner()) return;
    this.taskStore.update(this.task().id, {
      status: st.name,
      statusId: st.id,
      completed: Boolean(st.isCompleted)
    });
  }

  protected onAddTimesheetEntry(entry: NewTimesheetEntry): void {
    this.timesheetStore.addEntry(entry);
  }

  protected onUpdateTimesheetEntry(event: { id: number; changes: Partial<TimesheetEntry> }): void {
    this.timesheetStore.updateEntry(event.id, event.changes);
  }

  protected onDeleteTimesheetEntry(id: number): void {
    this.timesheetStore.deleteEntry(id);
  }

  protected formatDate(value: string): string {
    if (!value) return 'No date';
    return value;
  }

  protected isImage(type: string): boolean {
    return type.startsWith('image/');
  }

  protected isPdf(type: string): boolean {
    return type === 'application/pdf' || type.includes('pdf');
  }

  protected isExcel(type: string): boolean {
    return type.includes('excel') || type.includes('spreadsheet') || type.includes('sheet') || type === 'application/vnd.ms-excel' || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  protected orderedAttachments() {
    return [...(this.task().attachments ?? [])].sort((first, second) => {
      const order = (attachment: { type: string }) => {
        if (this.isImage(attachment.type)) return 0;
        if (this.isPdf(attachment.type)) return 1;
        if (this.isExcel(attachment.type)) return 2;
        return 3;
      };
      return order(first) - order(second);
    });
  }

  protected imageAttachments() {
    return (this.task().attachments ?? []).filter((attachment) => this.isImage(attachment.type));
  }

  protected pdfAttachments() {
    return (this.task().attachments ?? []).filter((attachment) => this.isPdf(attachment.type));
  }

  protected excelAttachments() {
    return (this.task().attachments ?? []).filter((attachment) => this.isExcel(attachment.type));
  }

  protected otherAttachments() {
    return (this.task().attachments ?? []).filter((attachment) => !this.isImage(attachment.type) && !this.isPdf(attachment.type) && !this.isExcel(attachment.type));
  }

  protected attachmentUrl(value: string): string {
    if (!value) return '';
    if (value.startsWith('data:') || /^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/')) return `${this.uploadBaseUrl}${value}`;
    return value;
  }

  protected openImage(dataUrl: string): void {
    this.selectedImage.set(this.attachmentUrl(dataUrl));
  }

  protected downloadFile(fileUrl: string, fileName: string): void {
    const href = this.attachmentUrl(fileUrl);
    if (!href) return;

    fetch(href)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName || 'download';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      })
      .catch(() => {
        const link = document.createElement('a');
        link.href = href;
        link.download = fileName || 'download';
        link.rel = 'noopener noreferrer';
        link.target = '_self';
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
  }

  protected downloadSelectedImage(): void {
    const imageUrl = this.selectedImage();
    if (!imageUrl) return;

    const fileName = `image-${Date.now()}.png`;
    this.downloadFile(imageUrl, fileName);
  }

  protected closeImage(): void {
    this.selectedImage.set(null);
  }

  protected openRelatedTask(targetTaskId: number): void {
    if (!targetTaskId) return;
    this.taskStore.setActiveTaskId(targetTaskId);
  }

  getCustomFieldEntries(customFields?: Record<string, any>): { key: string; value: any }[] {
    if (!customFields || typeof customFields !== 'object') return [];
    return Object.entries(customFields)
      .filter(([_, val]) => val !== null && val !== undefined && val !== '')
      .map(([key, value]) => ({ key, value }));
  }
}
