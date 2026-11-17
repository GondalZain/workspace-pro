import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FormTemplatesApiService } from '../../../core/api/form-templates-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ProjectStoreService } from '../../../services/project-store.service';
import { FormPluginsDeploymentComponent } from './components/form-plugins-deployment/form-plugins-deployment.component';
import {
  BootstrapCol,
  BootstrapFieldSize,
  CreateTaskFormTemplatePayload,
  DEFAULT_STANDARD_FIELDS_CONFIG,
  FormCustomFieldDef,
  StandardFieldsConfig,
  TaskFormTemplate
} from '../../../models/task-form-template.model';
import { CustomFieldType } from '../../../models/custom-field.model';

export interface StandardFieldMeta {
  key: keyof StandardFieldsConfig;
  label: string;
  shortLabel: string;
  description: string;
  section: 'General' | 'Workflow & People' | 'Schedule & Effort' | 'Organization & Files';
  locked?: boolean;
}

@Component({
  selector: 'app-admin-form-templates-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FormPluginsDeploymentComponent],
  templateUrl: './form-templates.page.html',
  styleUrl: './form-templates.page.css'
})
export class AdminFormTemplatesPage implements OnInit, OnDestroy {
  private readonly formTemplatesApi = inject(FormTemplatesApiService);
  private readonly authService = inject(AuthService);
  private readonly projectStore = inject(ProjectStoreService);
  private refreshSub?: Subscription;

  readonly currentUser = signal(this.authService.getUser());
  readonly currentCompany = computed(() => this.currentUser()?.company || null);

  readonly templates = signal<TaskFormTemplate[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  // Studio Navigation & Filtering
  readonly activeMainTab = signal<'templates' | 'plugins'>('templates');
  readonly viewMode = signal<'gallery' | 'studio'>('gallery');
  readonly activeBuilderSection = signal<'identity' | 'standard' | 'custom' | 'integration'>('identity');
  readonly searchQuery = signal('');
  readonly filterType = signal<'all' | 'builtin' | 'custom'>('all');
  readonly quickPreviewTemplate = signal<TaskFormTemplate | null>(null);

  // Integration & Project Assignment State
  readonly modalTargetEntity = signal<'task' | 'project'>('task');
  readonly modalAssignmentMode = signal<'all' | 'specific'>('specific');
  readonly modalAssignedProjectIds = signal<number[]>([]);
  readonly projectSearchQuery = signal<string>('');

  readonly allProjects = computed(() => this.projectStore.projects());

  readonly filteredProjects = computed(() => {
    const list = this.projectStore.projects();
    const q = this.projectSearchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.title.toLowerCase().includes(q));
  });

  isProjectSelected(projectId: number): boolean {
    return this.modalAssignedProjectIds().includes(projectId);
  }

  toggleProjectAssignment(projectId: number): void {
    this.modalAssignedProjectIds.update((current) => {
      if (current.includes(projectId)) {
        return current.filter((id) => id !== projectId);
      } else {
        return [...current, projectId];
      }
    });
  }

  selectAllProjects(): void {
    const allIds = this.projectStore.projects().map((p) => p.id);
    this.modalAssignedProjectIds.set(allIds);
  }

  deselectAllProjects(): void {
    this.modalAssignedProjectIds.set([]);
  }

  pureDynamicForm(): void {
    for (const meta of this.standardFieldsMeta) {
      if (!meta.locked) {
        this.modalStandardFields[meta.key].enabled = false;
        this.modalStandardFields[meta.key].required = false;
      }
    }
  }

  // Computed KPIs & Filtered List
  readonly customTemplatesCount = computed(() =>
    this.templates().filter((t) => !t.isDefault && t.name.toLowerCase() !== 'standard task form').length
  );

  readonly totalCustomFieldsCount = computed(() =>
    this.templates()
      .filter((t) => !t.isDefault && t.name.toLowerCase() !== 'standard task form')
      .reduce((acc, t) => acc + (t.fieldsConfig?.customFields?.length || 0), 0)
  );

  readonly filteredTemplates = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    // Only show custom dynamic forms created by the user, exclude built-in standard form
    const list = this.templates().filter((t) => !t.isDefault && t.name.toLowerCase() !== 'standard task form');
    if (!query) return list;
    return list.filter((t) => {
      const inName = t.name.toLowerCase().includes(query);
      const inDesc = (t.description || '').toLowerCase().includes(query);
      const inFields = (t.fieldsConfig?.customFields || []).some((cf) =>
        cf.fieldName.toLowerCase().includes(query)
      );
      return inName || inDesc || inFields;
    });
  });

  // Standard Fields Metadata for Matrix Builder
  readonly standardFieldsMeta: StandardFieldMeta[] = [
    {
      key: 'project',
      label: 'Project Assignment',
      shortLabel: 'Project',
      description: 'Links the task to a project workspace',
      section: 'General',
      locked: true
    },
    {
      key: 'description',
      label: 'Standard Description',
      shortLabel: 'Description',
      description: 'Built-in multi-line task overview and context area',
      section: 'General'
    },
    {
      key: 'status',
      label: 'Task Status Stage',
      shortLabel: 'Status',
      description: 'Workflow stage selector (e.g. To Do, In Progress, Done)',
      section: 'Workflow & People'
    },
    {
      key: 'priority',
      label: 'Priority Level',
      shortLabel: 'Priority',
      description: 'Urgency indicator (Low, Medium, High)',
      section: 'Workflow & People'
    },
    {
      key: 'assignees',
      label: 'Team Assignees',
      shortLabel: 'Assignees',
      description: 'Select one or more team members responsible for the task',
      section: 'Workflow & People'
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      shortLabel: 'Due Date',
      description: 'Target completion calendar date',
      section: 'Schedule & Effort'
    },
    {
      key: 'dueTime',
      label: 'Due Time',
      shortLabel: 'Due Time',
      description: 'Specific deadline time of day',
      section: 'Schedule & Effort'
    },
    {
      key: 'estimatedTime',
      label: 'Estimated Time (Hours & Mins)',
      shortLabel: 'Est. Time',
      description: 'Planned effort duration for completing the task',
      section: 'Schedule & Effort'
    },
    {
      key: 'category',
      label: 'Category',
      shortLabel: 'Category',
      description: 'Classification group (e.g. Development, Design, QA)',
      section: 'Organization & Files'
    },
    {
      key: 'tags',
      label: 'Keywords & Tags',
      shortLabel: 'Tags',
      description: 'Comma-separated labels for filtering and search',
      section: 'Organization & Files'
    },
    {
      key: 'attachments',
      label: 'File Attachments',
      shortLabel: 'Files',
      description: 'Upload screenshots, PDFs, spreadsheets, and documents',
      section: 'Organization & Files'
    }
  ];

  // Studio Editor State
  readonly editingTemplate = signal<TaskFormTemplate | null>(null);

  modalName = '';
  modalSectionTitle = '';
  modalDescription = '';
  modalIsDefault = false;
  modalStandardFields: StandardFieldsConfig = JSON.parse(JSON.stringify(DEFAULT_STANDARD_FIELDS_CONFIG));
  modalCustomFields: FormCustomFieldDef[] = [];

  // Custom Field Builder inside Studio
  isAddingCustomField = false;
  editingCustomFieldIndex: number | null = null;
  newCustomFieldName = '';
  newCustomFieldType: CustomFieldType = 'text';
  newCustomColumnWidth: 'half' | 'full' | 'third' | 'quarter' = 'half';
  newCustomBsCol: BootstrapCol = 'col-md-6';
  newCustomFieldSize: BootstrapFieldSize = 'default';
  newCustomPlaceholder = '';
  newCustomDescription = '';
  newCustomDefaultValue = '';
  newCustomIsRequired = false;
  newCustomIsReadonly = false;
  newCustomOptions: string[] = [];
  newCustomOptionInput = '';
  readonly showLayoutGuides = signal<boolean>(false);
  readonly previewFormValues = signal<Record<string, any>>({});
  readonly previewSubmitSuccess = signal<boolean>(false);

  readonly quickFieldTypes: { type: CustomFieldType; label: string; icon: string }[] = [
    { type: 'text', label: 'Text', icon: 'Aa' },
    { type: 'textarea', label: 'Long Text', icon: '¶' },
    { type: 'dropdown', label: 'Dropdown', icon: '▾' },
    { type: 'radio', label: 'Radio', icon: '◉' },
    { type: 'number', label: 'Number', icon: '#' },
    { type: 'date', label: 'Date', icon: '📅' },
    { type: 'checkbox', label: 'Checkbox', icon: '☑' },
    { type: 'email', label: 'Email', icon: '@' },
    { type: 'url', label: 'URL', icon: '🔗' }
  ];

  readonly bootstrapColOptions: { col: BootstrapCol; label: string; sub: string; icon: string }[] = [
    { col: 'col-12', label: '100%', sub: 'Full Width', icon: '▬' },
    { col: 'col-md-6', label: '50%', sub: 'Half Width', icon: '▮▮' },
    { col: 'col-md-4', label: '33%', sub: 'One-Third', icon: '▮▮▮' },
    { col: 'col-md-3', label: '25%', sub: 'Quarter', icon: '▮▮▮▮' }
  ];

  readonly fieldSizeOptions: { size: BootstrapFieldSize; label: string; badge: string }[] = [
    { size: 'sm', label: 'Small', badge: 'SM' },
    { size: 'default', label: 'Normal', badge: 'MD' },
    { size: 'lg', label: 'Large', badge: 'LG' }
  ];

  ngOnInit(): void {
    this.loadTemplates();
    if (this.projectStore.projects().length === 0) {
      this.projectStore.refresh();
    }
    this.refreshSub = this.formTemplatesApi.refresh$.subscribe(() => {
      this.loadTemplates();
      this.projectStore.refresh();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadTemplates(): void {
    this.isLoading.set(true);
    this.formTemplatesApi.list().subscribe({
      next: (data) => {
        this.templates.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Failed to load form templates.');
        this.isLoading.set(false);
      }
    });
  }

  getEnabledStandardFields(tmpl: TaskFormTemplate): string[] {
    const sf = tmpl.fieldsConfig?.standardFields || DEFAULT_STANDARD_FIELDS_CONFIG;
    return this.standardFieldsMeta
      .filter((m) => !m.locked && sf[m.key]?.enabled !== false)
      .map((m) => m.shortLabel);
  }

  getEnabledStandardCount(sf: StandardFieldsConfig): number {
    return this.standardFieldsMeta.filter((m) => sf[m.key]?.enabled !== false).length;
  }

  openCreateModal(mode: 'dynamic' | 'standard' = 'dynamic'): void {
    this.editingTemplate.set(null);
    this.modalName = '';
    this.modalSectionTitle = '';
    this.modalDescription = '';
    this.modalIsDefault = false;
    this.modalTargetEntity.set('task');
    this.modalAssignmentMode.set('specific');
    this.modalAssignedProjectIds.set([]);
    this.projectSearchQuery.set('');
    this.modalStandardFields = JSON.parse(JSON.stringify(DEFAULT_STANDARD_FIELDS_CONFIG));
    this.modalCustomFields = [];
    this.resetNewCustomFieldForm();
    this.openAddCustomField();
    this.viewMode.set('studio');
  }

  openEditModal(template: TaskFormTemplate): void {
    this.editingTemplate.set(template);
    this.modalName = template.name;
    this.modalSectionTitle = template.fieldsConfig?.sectionTitle || '';
    this.modalDescription = template.description || '';
    this.modalIsDefault = template.isDefault;
    this.modalTargetEntity.set(template.targetEntity || 'task');
    this.projectSearchQuery.set('');
    const assigned = template.assignedProjectIds || [];
    this.modalAssignedProjectIds.set([...assigned]);
    const totalProj = this.projectStore.projects().length;
    if (totalProj > 0 && assigned.length === totalProj) {
      this.modalAssignmentMode.set('all');
    } else {
      this.modalAssignmentMode.set('specific');
    }
    const mergedStandard = {
      ...JSON.parse(JSON.stringify(DEFAULT_STANDARD_FIELDS_CONFIG)),
      ...JSON.parse(JSON.stringify(template.fieldsConfig?.standardFields || {}))
    };
    this.modalStandardFields = mergedStandard;
    this.modalCustomFields = JSON.parse(JSON.stringify(template.fieldsConfig?.customFields || []));
    this.resetNewCustomFieldForm();
    this.activeBuilderSection.set('identity');
    this.viewMode.set('studio');
  }

  duplicateTemplate(template: TaskFormTemplate, event?: Event): void {
    event?.stopPropagation();
    this.editingTemplate.set(null);
    this.modalName = `${template.name} (Copy)`;
    this.modalSectionTitle = template.fieldsConfig?.sectionTitle || '';
    this.modalDescription = template.description || '';
    this.modalIsDefault = false;
    this.modalTargetEntity.set(template.targetEntity || 'task');
    this.modalAssignmentMode.set('specific');
    this.modalAssignedProjectIds.set([]);
    this.projectSearchQuery.set('');
    this.modalStandardFields = JSON.parse(
      JSON.stringify(template.fieldsConfig?.standardFields || DEFAULT_STANDARD_FIELDS_CONFIG)
    );
    this.modalCustomFields = JSON.parse(JSON.stringify(template.fieldsConfig?.customFields || []));
    this.resetNewCustomFieldForm();
    this.activeBuilderSection.set('identity');
    this.viewMode.set('studio');
  }

  openQuickPreview(template: TaskFormTemplate, event?: Event): void {
    event?.stopPropagation();
    this.quickPreviewTemplate.set(template);
  }

  closeQuickPreview(): void {
    this.quickPreviewTemplate.set(null);
  }

  closeModal(): void {
    this.viewMode.set('gallery');
    this.editingTemplate.set(null);
    this.resetNewCustomFieldForm();
  }

  applyPreset(preset: 'bug' | 'feature' | 'support' | 'qa' | 'standard'): void {
    const baseSf: StandardFieldsConfig = JSON.parse(JSON.stringify(DEFAULT_STANDARD_FIELDS_CONFIG));

    if (preset === 'bug') {
      this.modalName = 'Bug Report Form';
      this.modalDescription = 'Structured defect reporting with severity, environment, and reproduction steps.';
      baseSf.description.enabled = false;
      baseSf.estimatedTime.enabled = false;
      baseSf.priority.enabled = true;
      baseSf.priority.required = true;
      baseSf.attachments.enabled = true;
      this.modalStandardFields = baseSf;
      this.modalCustomFields = [
        {
          fieldKey: 'severity',
          fieldName: 'Severity Level',
          fieldType: 'dropdown',
          columnWidth: 'half',
          options: ['Critical (Blocker)', 'Major', 'Minor', 'Cosmetic'],
          isRequired: true,
          orderIndex: 0
        },
        {
          fieldKey: 'environment',
          fieldName: 'Environment / Browser',
          fieldType: 'text',
          columnWidth: 'half',
          placeholder: 'e.g. Production · Chrome 124 / Windows 11',
          isRequired: true,
          orderIndex: 1
        },
        {
          fieldKey: 'steps_to_reproduce',
          fieldName: 'Steps to Reproduce & Expected vs Actual',
          fieldType: 'textarea',
          columnWidth: 'full',
          placeholder: '1. Navigate to...\n2. Click on...\nExpected: ...\nActual: ...',
          isRequired: true,
          orderIndex: 2
        }
      ];
    } else if (preset === 'feature') {
      this.modalName = 'Feature Request Form';
      this.modalDescription = 'Capture product enhancement ideas, user stories, and business impact.';
      baseSf.dueTime.enabled = false;
      this.modalStandardFields = baseSf;
      this.modalCustomFields = [
        {
          fieldKey: 'business_impact',
          fieldName: 'Business Impact',
          fieldType: 'dropdown',
          columnWidth: 'half',
          options: ['High Impact', 'Medium Impact', 'Nice to Have'],
          isRequired: true,
          orderIndex: 0
        },
        {
          fieldKey: 'user_story',
          fieldName: 'User Story / Acceptance Criteria',
          fieldType: 'textarea',
          columnWidth: 'full',
          placeholder: 'As a [role], I want [feature] so that [benefit]...',
          isRequired: true,
          orderIndex: 1
        }
      ];
    } else if (preset === 'support') {
      this.modalName = 'Client Support Ticket';
      this.modalDescription = 'Customer issue intake form with client contact info and SLA priority.';
      baseSf.estimatedTime.enabled = false;
      baseSf.tags.enabled = false;
      this.modalStandardFields = baseSf;
      this.modalCustomFields = [
        {
          fieldKey: 'client_name',
          fieldName: 'Client / Account Name',
          fieldType: 'text',
          columnWidth: 'half',
          placeholder: 'Enter client or organization name...',
          isRequired: true,
          orderIndex: 0
        },
        {
          fieldKey: 'Urgency',
          fieldName: 'SLA Urgency',
          fieldType: 'dropdown',
          columnWidth: 'half',
          options: ['P1 - Urgent (< 2h)', 'P2 - High (< 8h)', 'P3 - Normal (< 24h)'],
          isRequired: true,
          orderIndex: 1
        }
      ];
    } else if (preset === 'qa') {
      this.modalName = 'QA Verification Task';
      this.modalDescription = 'Quality assurance testing checklist and release sign-off form.';
      this.modalStandardFields = baseSf;
      this.modalCustomFields = [
        {
          fieldKey: 'build_version',
          fieldName: 'Build / Release Version',
          fieldType: 'text',
          columnWidth: 'half',
          placeholder: 'e.g. v2.4.0-rc1',
          isRequired: true,
          orderIndex: 0
        },
        {
          fieldKey: 'regression_passed',
          fieldName: 'Regression Suite Passed',
          fieldType: 'checkbox',
          columnWidth: 'half',
          isRequired: false,
          orderIndex: 1
        }
      ];
    } else {
      this.modalName = 'Standard Task Form';
      this.modalDescription = 'Complete standard task creation form with all built-in fields enabled.';
      this.modalStandardFields = baseSf;
      this.modalCustomFields = [];
    }
  }

  enableAllStandardFields(): void {
    for (const meta of this.standardFieldsMeta) {
      this.modalStandardFields[meta.key].enabled = true;
    }
  }

  minimalStandardFields(): void {
    for (const meta of this.standardFieldsMeta) {
      if (!meta.locked) {
        this.modalStandardFields[meta.key].enabled = false;
        this.modalStandardFields[meta.key].required = false;
      }
    }
    this.modalStandardFields.priority.enabled = true;
  }

  onStandardFieldToggle(key: keyof StandardFieldsConfig): void {
    if (!this.modalStandardFields[key].enabled) {
      this.modalStandardFields[key].required = false;
    }
  }

  resetNewCustomFieldForm(): void {
    this.isAddingCustomField = false;
    this.editingCustomFieldIndex = null;
    this.newCustomFieldName = '';
    this.newCustomFieldType = 'text';
    this.newCustomColumnWidth = 'half';
    this.newCustomBsCol = 'col-md-6';
    this.newCustomFieldSize = 'default';
    this.newCustomPlaceholder = '';
    this.newCustomDescription = '';
    this.newCustomDefaultValue = '';
    this.newCustomIsRequired = false;
    this.newCustomIsReadonly = false;
    this.newCustomOptions = [];
    this.newCustomOptionInput = '';
  }

  quickAddField(type: CustomFieldType): void {
    this.resetNewCustomFieldForm();
    this.isAddingCustomField = true;
    this.onCustomFieldTypeChange(type);
  }

  getFieldTypeLabel(type: CustomFieldType): string {
    switch (type) {
      case 'text': return 'Text';
      case 'textarea': return 'Long Text';
      case 'dropdown': return 'Dropdown';
      case 'radio': return 'Radio';
      case 'number': return 'Number';
      case 'date': return 'Date';
      case 'time': return 'Time';
      case 'checkbox': return 'Checkbox';
      case 'email': return 'Email';
      case 'phone': return 'Phone';
      case 'url': return 'URL';
      default: return type;
    }
  }

  toggleFieldRequired(index: number, event?: Event): void {
    event?.stopPropagation();
    const field = this.modalCustomFields[index];
    if (!field) return;
    field.isRequired = !field.isRequired;
    this.modalCustomFields = [...this.modalCustomFields];
  }

  duplicateCustomField(index: number, event?: Event): void {
    event?.stopPropagation();
    const src = this.modalCustomFields[index];
    if (!src) return;
    const copyName = `${src.fieldName} (Copy)`;
    const copyKey = `${src.fieldKey}_copy_${Date.now().toString().slice(-4)}`;
    const copy: FormCustomFieldDef = {
      ...src,
      fieldKey: copyKey,
      fieldName: copyName,
      options: src.options ? [...src.options] : [],
      orderIndex: index + 1
    };
    const updated = [...this.modalCustomFields];
    updated.splice(index + 1, 0, copy);
    this.modalCustomFields = updated.map((f, idx) => ({ ...f, orderIndex: idx }));
  }

  onCustomFieldTypeChange(type: CustomFieldType): void {
    this.newCustomFieldType = type;
    if (type === 'textarea') {
      this.newCustomBsCol = 'col-12';
      this.newCustomColumnWidth = 'full';
    }
  }

  selectBsCol(col: BootstrapCol): void {
    this.newCustomBsCol = col;
    this.newCustomColumnWidth = col === 'col-12' ? 'full' : col === 'col-md-4' ? 'third' : col === 'col-md-3' ? 'quarter' : 'half';
  }

  selectFieldSize(size: BootstrapFieldSize): void {
    this.newCustomFieldSize = size;
  }

  getBsCol(cf: FormCustomFieldDef): BootstrapCol {
    if (cf.bsCol) return cf.bsCol;
    if (cf.columnWidth === 'full' || (!cf.columnWidth && cf.fieldType === 'textarea')) return 'col-12';
    if (cf.columnWidth === 'third') return 'col-md-4';
    if (cf.columnWidth === 'quarter') return 'col-md-3';
    return 'col-md-6';
  }

  getBsColLabel(cf: FormCustomFieldDef): string {
    const col = this.getBsCol(cf);
    switch (col) {
      case 'col-12': return '100%';
      case 'col-md-6': return '50%';
      case 'col-md-4': return '33%';
      case 'col-md-3': return '25%';
      case 'col-md-8': return '67%';
      default: return col;
    }
  }

  getFieldSizeClass(cf: FormCustomFieldDef): string {
    if (cf.fieldSize === 'sm') return 'form-control-sm';
    if (cf.fieldSize === 'lg') return 'form-control-lg';
    return '';
  }

  getSelectSizeClass(cf: FormCustomFieldDef): string {
    if (cf.fieldSize === 'sm') return 'form-select-sm';
    if (cf.fieldSize === 'lg') return 'form-select-lg';
    return '';
  }

  cycleFieldBsCol(index: number, event?: Event): void {
    event?.stopPropagation();
    const field = this.modalCustomFields[index];
    if (!field) return;
    const current = this.getBsCol(field);
    const sequence: BootstrapCol[] = ['col-md-6', 'col-12', 'col-md-4', 'col-md-3'];
    const nextIdx = (sequence.indexOf(current) + 1) % sequence.length;
    const next = sequence[nextIdx];
    field.bsCol = next;
    field.columnWidth = next === 'col-12' ? 'full' : next === 'col-md-4' ? 'third' : next === 'col-md-3' ? 'quarter' : 'half';
    this.modalCustomFields = [...this.modalCustomFields];
  }

  cycleFieldSize(index: number, event?: Event): void {
    event?.stopPropagation();
    const field = this.modalCustomFields[index];
    if (!field) return;
    const current = field.fieldSize || 'default';
    const sequence: BootstrapFieldSize[] = ['default', 'sm', 'lg'];
    const nextIdx = (sequence.indexOf(current) + 1) % sequence.length;
    field.fieldSize = sequence[nextIdx];
    this.modalCustomFields = [...this.modalCustomFields];
  }

  setFieldBsCol(index: number, bsCol: BootstrapCol, event?: Event): void {
    event?.stopPropagation();
    const field = this.modalCustomFields[index];
    if (!field) return;
    field.bsCol = bsCol;
    field.columnWidth = bsCol === 'col-12' ? 'full' : bsCol === 'col-md-4' ? 'third' : bsCol === 'col-md-3' ? 'quarter' : 'half';
    this.modalCustomFields = [...this.modalCustomFields];
  }

  setFieldSize(index: number, size: BootstrapFieldSize, event?: Event): void {
    event?.stopPropagation();
    const field = this.modalCustomFields[index];
    if (!field) return;
    field.fieldSize = size;
    this.modalCustomFields = [...this.modalCustomFields];
  }

  toggleFieldWidth(index: number, event?: Event): void {
    this.cycleFieldBsCol(index, event);
  }

  toggleLayoutGuides(): void {
    this.showLayoutGuides.update((v) => !v);
  }

  onPreviewInputChange(fieldKey: string, value: any): void {
    this.previewFormValues.update((curr) => ({ ...curr, [fieldKey]: value }));
  }

  simulateFormSubmit(): void {
    this.previewSubmitSuccess.set(true);
    setTimeout(() => {
      this.previewSubmitSuccess.set(false);
    }, 4000);
  }

  resetPreviewForm(): void {
    this.previewFormValues.set({});
    this.previewSubmitSuccess.set(false);
  }

  openAddCustomField(): void {
    this.resetNewCustomFieldForm();
    this.isAddingCustomField = true;
  }

  goToCustomFields(): void {
    this.activeBuilderSection.set('custom');
    if (this.modalCustomFields.length === 0) {
      this.openAddCustomField();
    }
  }

  editCustomField(index: number): void {
    const cf = this.modalCustomFields[index];
    if (!cf) return;
    this.editingCustomFieldIndex = index;
    this.newCustomFieldName = cf.fieldName;
    this.newCustomFieldType = cf.fieldType;
    this.newCustomBsCol = this.getBsCol(cf);
    this.newCustomFieldSize = cf.fieldSize || 'default';
    this.newCustomColumnWidth = cf.columnWidth || (cf.fieldType === 'textarea' ? 'full' : 'half');
    this.newCustomPlaceholder = cf.placeholder || '';
    this.newCustomDescription = cf.description || '';
    this.newCustomDefaultValue = cf.defaultValue || '';
    this.newCustomIsRequired = Boolean(cf.isRequired);
    this.newCustomIsReadonly = Boolean(cf.isReadonly);
    this.newCustomOptions = cf.options ? [...cf.options] : [];
    this.newCustomOptionInput = '';
    this.isAddingCustomField = true;
  }

  moveCustomField(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.modalCustomFields.length) return;
    const copy = [...this.modalCustomFields];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    this.modalCustomFields = copy.map((f, idx) => ({ ...f, orderIndex: idx }));
  }

  addOption(): void {
    const val = this.newCustomOptionInput.trim();
    if (val && !this.newCustomOptions.includes(val)) {
      this.newCustomOptions.push(val);
      this.newCustomOptionInput = '';
    }
  }

  removeOption(index: number): void {
    this.newCustomOptions.splice(index, 1);
  }

  saveCustomFieldToTemplate(): void {
    const name = this.newCustomFieldName.trim();
    if (!name) return;

    const baseKey = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const fieldKey = baseKey || `field_${Date.now()}`;

    const hasOptions = this.newCustomFieldType === 'dropdown' || this.newCustomFieldType === 'radio';
    const fieldData: FormCustomFieldDef = {
      fieldKey,
      fieldName: name,
      fieldType: this.newCustomFieldType,
      columnWidth: this.newCustomBsCol === 'col-12' ? 'full' : this.newCustomBsCol === 'col-md-4' ? 'third' : this.newCustomBsCol === 'col-md-3' ? 'quarter' : 'half',
      bsCol: this.newCustomBsCol,
      fieldSize: this.newCustomFieldSize,
      description: this.newCustomDescription.trim() || undefined,
      defaultValue: this.newCustomDefaultValue.trim() || undefined,
      options: hasOptions ? [...this.newCustomOptions] : [],
      placeholder: this.newCustomPlaceholder.trim() || undefined,
      isRequired: this.newCustomIsRequired,
      isReadonly: this.newCustomIsReadonly || undefined,
      orderIndex:
        this.editingCustomFieldIndex !== null
          ? this.editingCustomFieldIndex
          : this.modalCustomFields.length
    };

    if (fieldData.defaultValue && !this.previewFormValues()[fieldKey]) {
      this.onPreviewInputChange(fieldKey, fieldData.defaultValue);
    }

    if (this.editingCustomFieldIndex !== null) {
      this.modalCustomFields[this.editingCustomFieldIndex] = fieldData;
      this.modalCustomFields = [...this.modalCustomFields];
    } else {
      this.modalCustomFields = [...this.modalCustomFields, fieldData];
    }

    this.resetNewCustomFieldForm();
  }

  removeCustomFieldFromTemplate(index: number): void {
    this.modalCustomFields.splice(index, 1);
    this.modalCustomFields = this.modalCustomFields.map((f, idx) => ({ ...f, orderIndex: idx }));
    if (this.editingCustomFieldIndex === index) {
      this.resetNewCustomFieldForm();
    }
  }

  saveTemplate(): void {
    if (!this.modalName.trim()) {
      this.errorMessage.set('Please provide a form template name.');
      this.activeBuilderSection.set('identity');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const isTask = this.modalTargetEntity() === 'task';
    const isAll = isTask && this.modalAssignmentMode() === 'all';
    const payload: CreateTaskFormTemplatePayload = {
      name: this.modalName.trim(),
      description: this.modalDescription.trim() || null,
      isDefault: Boolean(this.editingTemplate()?.isDefault),
      targetEntity: this.modalTargetEntity(),
      applyToAllProjects: isAll,
      assignedProjectIds: (isTask && !isAll) ? this.modalAssignedProjectIds() : [],
      fieldsConfig: {
        sectionTitle: this.modalSectionTitle.trim(),
        standardFields: this.modalStandardFields,
        customFields: this.modalCustomFields
      }
    };

    const editId = this.editingTemplate()?.id;
    const request$ = editId
      ? this.formTemplatesApi.update(editId, payload)
      : this.formTemplatesApi.create(payload);

    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeModal();
        this.showSuccess(
          editId ? 'Form template updated successfully!' : 'New form template created successfully!'
        );
        this.loadTemplates();
        this.projectStore.refresh();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to save form template.');
      }
    });
  }

  deleteTemplate(template: TaskFormTemplate, event: Event): void {
    event.stopPropagation();
    if (template.isDefault) {
      return;
    }
    if (!confirm(`Are you sure you want to delete form template "${template.name}"?`)) {
      return;
    }

    this.formTemplatesApi.delete(template.id).subscribe({
      next: () => {
        this.showSuccess(`Template "${template.name}" deleted.`);
        this.loadTemplates();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Failed to delete template.');
      }
    });
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(''), 4000);
  }
}
