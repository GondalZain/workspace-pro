import { Component, OnInit, OnDestroy, computed, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FormTemplatesApiService } from '../../../../../core/api/form-templates-api.service';
import { ProjectStoreService } from '../../../../../services/project-store.service';
import { TaskStoreService } from '../../../../../services/task-store.service';
import { StandardFieldsConfig, TaskFormTemplate } from '../../../../../models/task-form-template.model';
import { Project } from '../../../../../models/project.model';

export interface StandardFieldToggle {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
  required: boolean;
  locked?: boolean;
}

@Component({
  selector: 'app-form-plugins-deployment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-plugins-deployment.component.html',
  styleUrl: './form-plugins-deployment.component.css'
})
export class FormPluginsDeploymentComponent implements OnInit, OnDestroy {
  private readonly formTemplatesApi = inject(FormTemplatesApiService);
  private readonly projectStore = inject(ProjectStoreService);
  private readonly taskStore = inject(TaskStoreService);
  private refreshSub?: Subscription;

  // Inputs / Outputs
  readonly templates = input<TaskFormTemplate[]>([]);
  readonly openBuilder = output<TaskFormTemplate | null>();

  // Local fallback templates signal
  readonly localTemplates = signal<TaskFormTemplate[]>([]);

  // Active Tab ('task' | 'project')
  readonly activeTab = signal<'task' | 'project'>('task');

  // Search & Selection State
  readonly taskSearch = signal<string>('');
  readonly selectedTaskProjectIds = signal<number[]>([]);
  readonly bulkTaskTemplateId = signal<number | null>(null);

  readonly projectSearch = signal<string>('');
  readonly newProjectTemplateId = signal<number | null>(null);

  // Target-Dependent Form Integration (Type -> Project Filter -> Project/Task -> Form)
  readonly integrationTargetType = signal<'project' | 'task'>('project');
  readonly integrationTaskProjectFilter = signal<number | null>(null);
  readonly integrationTargetId = signal<number | null>(null);
  readonly integrationTemplateId = signal<number | null>(null);
  readonly attachedTypeFilter = signal<'all' | 'project' | 'task'>('all');

  // Status & Feedback Signals
  readonly isSaving = signal<boolean>(false);
  readonly savedProjectId = signal<number | null>(null);
  readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  // Inspect Modal State
  readonly inspectingProject = signal<Project | null>(null);
  readonly inspectingMode = signal<'task' | 'project'>('task');
  readonly inspectBuiltinToggles = signal<StandardFieldToggle[]>([]);

  // Projects & Tasks from Stores
  readonly allProjects = computed(() => this.projectStore.projects());
  readonly allTasks = computed(() => this.taskStore.tasks());

  // Tasks filtered by the selected Project Filter in the Attach Form card
  readonly filteredTasksForSelector = computed(() => {
    const projectFilter = this.integrationTaskProjectFilter();
    const tasks = this.allTasks();
    if (projectFilter === null) return tasks;
    return tasks.filter((t) => Number(t.projectId) === Number(projectFilter));
  });

  // Active templates list (combines input with locally loaded)
  readonly allTemplates = computed(() => {
    return this.templates().length > 0 ? this.templates() : this.localTemplates();
  });

  // All custom dynamic templates (applicable to tasks AND projects)
  readonly allCustomTemplates = computed(() => {
    return this.allTemplates().filter((t) => !t.isDefault && t.name.toLowerCase() !== 'standard task form');
  });

  // Filtered Task Projects
  readonly filteredTaskProjects = computed(() => {
    const list = this.allProjects();
    const q = this.taskSearch().trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.title.toLowerCase().includes(q) || String(p.id).includes(q));
  });

  // Attached Projects & Tasks (only items with an attached custom formTemplateId)
  readonly attachedIntegrations = computed(() => {
    const typeFilter = this.attachedTypeFilter();
    const q = this.projectSearch().trim().toLowerCase();
    const projectItems = typeFilter === 'task'
      ? []
      : this.allProjects()
          .filter((p) => p.formTemplateId != null)
          .map((p) => ({
            type: 'project' as const,
            id: p.id,
            title: p.title,
            subtitle: p.description || 'Project',
            formTemplateId: p.formTemplateId!
          }));

    const taskItems = typeFilter === 'project'
      ? []
      : this.allTasks()
          .filter((t) => t.formTemplateId != null)
          .map((t) => ({
            type: 'task' as const,
            id: t.id,
            title: t.title,
            subtitle: t.projectId ? `Project: ${this.getProjectNameById(t.projectId)}` : 'Standalone Task',
            formTemplateId: t.formTemplateId!
          }));

    const combined = [...projectItems, ...taskItems];
    if (!q) return combined;
    return combined.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        String(item.id).includes(q) ||
        item.type.includes(q)
    );
  });

  // Filtered Project-level Projects (kept for compatibility)
  readonly filteredProjectsForProjectsTab = computed(() => {
    const list = this.allProjects();
    const q = this.projectSearch().trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.title.toLowerCase().includes(q) || String(p.id).includes(q));
  });

  // Active inspecting template
  readonly inspectingTemplate = computed<TaskFormTemplate | null>(() => {
    const proj = this.inspectingProject();
    if (!proj) return null;
    if (proj.formTemplateId) {
      const match = this.allTemplates().find((t) => t.id === proj.formTemplateId);
      if (match) return match;
    }
    // Fallback to default template
    const def = this.allTemplates().find((t) => t.isDefault);
    return def || this.allTemplates()[0] || null;
  });

  ngOnInit(): void {
    this.projectStore.refresh();
    this.taskStore.refresh();
    this.loadTemplates();
    this.refreshSub = this.formTemplatesApi.refresh$.subscribe(() => {
      this.loadTemplates();
      this.projectStore.refresh();
      this.taskStore.refresh();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadTemplates(): void {
    this.formTemplatesApi.list().subscribe({
      next: (data) => this.localTemplates.set(data),
      error: () => {}
    });
  }

  // Selection Logic
  isProjectSelected(id: number): boolean {
    return this.selectedTaskProjectIds().includes(id);
  }

  toggleProjectSelection(id: number): void {
    this.selectedTaskProjectIds.update((current) => {
      if (current.includes(id)) {
        return current.filter((x) => x !== id);
      } else {
        return [...current, id];
      }
    });
  }

  isAllSelected(): boolean {
    const currentList = this.filteredTaskProjects();
    if (currentList.length === 0) return false;
    return currentList.every((p) => this.selectedTaskProjectIds().includes(p.id));
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.clearSelection();
    } else {
      this.selectAllProjects();
    }
  }

  selectAllProjects(): void {
    const ids = this.filteredTaskProjects().map((p) => p.id);
    this.selectedTaskProjectIds.set(ids);
  }

  clearSelection(): void {
    this.selectedTaskProjectIds.set([]);
  }

  // Individual Project Assignment
  quickAssignProject(projectId: number, targetValue: number | null): void {
    const tmplId = targetValue !== null && targetValue !== undefined && !isNaN(Number(targetValue)) ? Number(targetValue) : null;
    this.isSaving.set(true);

    // Optimistic local update
    this.projectStore.projects.update((items) =>
      items.map((p) => (p.id === projectId ? { ...p, formTemplateId: tmplId } : p))
    );

    this.formTemplatesApi.assignProjects(tmplId, [projectId]).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.savedProjectId.set(projectId);
        setTimeout(() => {
          if (this.savedProjectId() === projectId) {
            this.savedProjectId.set(null);
          }
        }, 2200);
        this.projectStore.refresh();
        this.loadTemplates();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.showToast('error', err.error?.error || 'Failed to update form template.');
        this.projectStore.refresh();
      }
    });
  }

  // Bulk Project Assignment
  applyBulkTemplate(): void {
    const selected = this.selectedTaskProjectIds();
    if (selected.length === 0) {
      this.showToast('error', 'Please select at least one project from the list.');
      return;
    }
    const tmplId = this.bulkTaskTemplateId() !== null ? Number(this.bulkTaskTemplateId()) : null;
    this.isSaving.set(true);

    // Optimistic local update
    this.projectStore.projects.update((items) =>
      items.map((p) => (selected.includes(p.id) ? { ...p, formTemplateId: tmplId } : p))
    );

    this.formTemplatesApi.assignProjects(tmplId, selected).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast('success', `Applied template to ${selected.length} project(s) successfully.`);
        this.selectedTaskProjectIds.set([]);
        this.projectStore.refresh();
        this.loadTemplates();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.showToast('error', err.error?.error || 'Failed to apply form template to selected projects.');
        this.projectStore.refresh();
      }
    });
  }

  // Update New Project Default Form
  saveNewProjectTemplate(): void {
    const tmplId = this.newProjectTemplateId();
    this.showToast('success', tmplId ? 'New Project template updated.' : 'New Project form set to Standard Default.');
  }

  // Dependent Type -> Target (Project or Task) -> Form Integration
  onIntegrationTypeChange(type: 'project' | 'task'): void {
    this.integrationTargetType.set(type);
    this.integrationTaskProjectFilter.set(null);
    this.integrationTargetId.set(null);
    this.integrationTemplateId.set(null);
  }

  onIntegrationProjectFilterChange(projectId: number | null): void {
    const id = projectId !== null && projectId !== undefined && !isNaN(Number(projectId)) ? Number(projectId) : null;
    this.integrationTaskProjectFilter.set(id);
    this.integrationTargetId.set(null);
    this.integrationTemplateId.set(null);
  }

  onIntegrationTargetChange(targetId: number | null): void {
    const id = targetId !== null && targetId !== undefined && !isNaN(Number(targetId)) ? Number(targetId) : null;
    this.integrationTargetId.set(id);
    if (!id) {
      this.integrationTemplateId.set(null);
      return;
    }
    if (this.integrationTargetType() === 'project') {
      const proj = this.allProjects().find((p) => p.id === id);
      this.integrationTemplateId.set(proj?.formTemplateId ?? null);
    } else {
      const task = this.allTasks().find((t) => t.id === id);
      this.integrationTemplateId.set(task?.formTemplateId ?? null);
    }
  }

  getProjectNameById(projectId?: number | null): string {
    if (!projectId) return '';
    const match = this.allProjects().find((p) => p.id === projectId);
    return match ? match.title : `Project #${projectId}`;
  }

  getTemplateNameById(templateId?: number | null): string {
    if (!templateId) return 'Built-in Standard Form';
    return this.allTemplates().find((t) => t.id === templateId)?.name || `Form #${templateId}`;
  }

  detachTarget(type: 'project' | 'task', targetId: number): void {
    this.isSaving.set(true);
    const request$ = type === 'project'
      ? this.formTemplatesApi.assignProjects(null, [targetId])
      : this.formTemplatesApi.assignTasks(null, [targetId]);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast('success', `Detached form from ${type === 'project' ? 'Project' : 'Task'} #${targetId}.`);
        this.projectStore.refresh();
        this.taskStore.refresh();
        this.loadTemplates();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.showToast('error', err.error?.error || `Failed to detach form from ${type}.`);
      }
    });
  }

  updateAttachedTargetTemplate(type: 'project' | 'task', targetId: number, templateId: number | null): void {
    const tmplId = templateId !== null && templateId !== undefined && !isNaN(Number(templateId)) ? Number(templateId) : null;
    if (tmplId === null) {
      this.detachTarget(type, targetId);
      return;
    }
    this.isSaving.set(true);
    const request$ = type === 'project'
      ? this.formTemplatesApi.assignProjects(tmplId, [targetId])
      : this.formTemplatesApi.assignTasks(tmplId, [targetId]);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast('success', `Updated attached form for ${type === 'project' ? 'Project' : 'Task'} #${targetId}.`);
        this.projectStore.refresh();
        this.taskStore.refresh();
        this.loadTemplates();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.showToast('error', err.error?.error || `Failed to update form.`);
      }
    });
  }

  integrateSelectedTarget(): void {
    const targetId = this.integrationTargetId();
    if (!targetId) {
      this.showToast('error', `Please select a ${this.integrationTargetType()} first.`);
      return;
    }
    const tmplId = this.integrationTemplateId() !== null && this.integrationTemplateId() !== undefined
      ? Number(this.integrationTemplateId())
      : null;

    this.isSaving.set(true);
    const type = this.integrationTargetType();
    const request$ = type === 'project'
      ? this.formTemplatesApi.assignProjects(tmplId, [targetId])
      : this.formTemplatesApi.assignTasks(tmplId, [targetId]);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        const tmplName = tmplId
          ? (this.allTemplates().find((t) => t.id === tmplId)?.name || 'Custom Form')
          : 'Built-in Standard Form';
        const label = type === 'project' ? `Project #${targetId}` : `Task #${targetId}`;
        this.showToast('success', `Integrated "${tmplName}" with ${label} successfully.`);
        this.projectStore.refresh();
        this.taskStore.refresh();
        this.loadTemplates();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.showToast('error', err.error?.error || `Failed to integrate form with ${type}.`);
      }
    });
  }

  // Open Integrated Form Inspector Modal for a Project
  openInspectModal(project: Project, mode: 'task' | 'project' = this.activeTab()): void {
    this.inspectingProject.set(project);
    this.inspectingMode.set(mode);

    const tmpl = this.inspectingTemplate();
    const std = tmpl?.fieldsConfig?.standardFields;

    if (mode === 'task') {
      this.inspectBuiltinToggles.set([
        { key: 'project', label: 'Project Association', category: 'Core', enabled: true, required: true, locked: true },
        { key: 'description', label: 'Description', category: 'Content', enabled: std?.description?.enabled ?? true, required: std?.description?.required ?? false },
        { key: 'status', label: 'Workflow Status', category: 'Workflow', enabled: std?.status?.enabled ?? true, required: std?.status?.required ?? false },
        { key: 'priority', label: 'Priority', category: 'Workflow', enabled: std?.priority?.enabled ?? true, required: std?.priority?.required ?? false },
        { key: 'assignees', label: 'Assignees', category: 'Team', enabled: std?.assignees?.enabled ?? true, required: std?.assignees?.required ?? false },
        { key: 'dueDate', label: 'Due Date', category: 'Schedule', enabled: std?.dueDate?.enabled ?? true, required: std?.dueDate?.required ?? false },
        { key: 'dueTime', label: 'Due Time', category: 'Schedule', enabled: std?.dueTime?.enabled ?? true, required: std?.dueTime?.required ?? false },
        { key: 'estimatedTime', label: 'Estimated Effort', category: 'Schedule', enabled: std?.estimatedTime?.enabled ?? true, required: std?.estimatedTime?.required ?? false },
        { key: 'category', label: 'Category', category: 'Organization', enabled: std?.category?.enabled ?? true, required: std?.category?.required ?? false },
        { key: 'tags', label: 'Tags', category: 'Organization', enabled: std?.tags?.enabled ?? true, required: std?.tags?.required ?? false },
        { key: 'attachments', label: 'Attachments', category: 'Files', enabled: std?.attachments?.enabled ?? true, required: std?.attachments?.required ?? false }
      ]);
    } else {
      // Mode === 'project'
      this.inspectBuiltinToggles.set([
        { key: 'title', label: 'Project Title', category: 'Core', enabled: true, required: true, locked: true },
        { key: 'description', label: 'Description', category: 'Content', enabled: true, required: false },
        { key: 'image', label: 'Project Cover Image', category: 'Branding', enabled: true, required: false },
        { key: 'defaultAssignee', label: 'Default Assignee Person', category: 'Automation', enabled: true, required: false },
        { key: 'formTemplate', label: 'Task Form Link Config', category: 'Configuration', enabled: true, required: false }
      ]);
    }
  }

  closeInspectModal(): void {
    this.inspectingProject.set(null);
  }

  toggleBuiltinField(toggle: StandardFieldToggle): void {
    if (toggle.locked) return;
    toggle.enabled = !toggle.enabled;
  }

  toggleBuiltinRequired(toggle: StandardFieldToggle): void {
    if (toggle.locked) return;
    toggle.required = !toggle.required;
  }

  enableAllFields(): void {
    this.inspectBuiltinToggles.update((items) =>
      items.map((i) => ({ ...i, enabled: true }))
    );
  }

  disableOptionalFields(): void {
    this.inspectBuiltinToggles.update((items) =>
      items.map((i) => (i.locked ? i : { ...i, enabled: false, required: false }))
    );
  }

  // Save changes made in the inspector to the template
  saveInspectorChanges(): void {
    const tmpl = this.inspectingTemplate();
    if (!tmpl) return;

    const toggles = this.inspectBuiltinToggles();
    const updatedStandard: any = { ...(tmpl.fieldsConfig?.standardFields || {}) };

    toggles.forEach((t) => {
      updatedStandard[t.key] = { enabled: t.enabled, required: t.required };
    });

    this.isSaving.set(true);
    this.formTemplatesApi.update(tmpl.id, {
      name: tmpl.name,
      description: tmpl.description,
      fieldsConfig: {
        standardFields: updatedStandard,
        customFields: tmpl.fieldsConfig?.customFields || []
      }
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast('success', `Saved built-in field configuration for "${tmpl.name}".`);
        this.closeInspectModal();
        this.loadTemplates();
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.showToast('error', err.error?.error || 'Failed to save changes.');
      }
    });
  }

  private showToast(type: 'success' | 'error', message: string): void {
    this.toast.set({ type, message });
    setTimeout(() => {
      if (this.toast()?.message === message) {
        this.toast.set(null);
      }
    }, 3200);
  }
}
