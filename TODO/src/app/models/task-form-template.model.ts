import { CustomFieldType } from './custom-field.model';

export interface StandardFieldConfig {
  enabled: boolean;
  required: boolean;
}

export interface StandardFieldsConfig {
  description: StandardFieldConfig;
  project: StandardFieldConfig;
  status: StandardFieldConfig;
  priority: StandardFieldConfig;
  assignees: StandardFieldConfig;
  dueDate: StandardFieldConfig;
  dueTime: StandardFieldConfig;
  estimatedTime: StandardFieldConfig;
  category: StandardFieldConfig;
  tags: StandardFieldConfig;
  attachments: StandardFieldConfig;
}

export type BootstrapCol = 'col-12' | 'col-md-6' | 'col-md-4' | 'col-md-3' | 'col-md-8';
export type BootstrapFieldSize = 'sm' | 'default' | 'lg';

export interface FormCustomFieldDef {
  fieldKey: string;
  fieldName: string;
  fieldType: CustomFieldType;
  options?: string[];
  placeholder?: string;
  description?: string;
  defaultValue?: string;
  isRequired: boolean;
  isReadonly?: boolean;
  orderIndex: number;
  columnWidth?: 'half' | 'full' | 'third' | 'quarter';
  bsCol?: BootstrapCol;
  fieldSize?: BootstrapFieldSize;
}

export interface FormTemplateFieldsConfig {
  sectionTitle?: string;
  standardFields: StandardFieldsConfig;
  customFields: FormCustomFieldDef[];
}

export interface TaskFormTemplate {
  id: number;
  companyId: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  targetEntity?: 'task' | 'project';
  assignedProjectIds?: number[];
  assignedProjectCount?: number;
  fieldsConfig: FormTemplateFieldsConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskFormTemplatePayload {
  name: string;
  description?: string | null;
  isDefault?: boolean;
  targetEntity?: 'task' | 'project';
  assignedProjectIds?: number[];
  applyToAllProjects?: boolean;
  fieldsConfig: FormTemplateFieldsConfig;
}

export interface UpdateTaskFormTemplatePayload {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  targetEntity?: 'task' | 'project';
  assignedProjectIds?: number[];
  applyToAllProjects?: boolean;
  fieldsConfig?: FormTemplateFieldsConfig;
}

export const DEFAULT_STANDARD_FIELDS_CONFIG: StandardFieldsConfig = {
  description: { enabled: true, required: false },
  project: { enabled: true, required: true },
  status: { enabled: true, required: false },
  priority: { enabled: true, required: false },
  assignees: { enabled: true, required: false },
  dueDate: { enabled: true, required: false },
  dueTime: { enabled: true, required: false },
  estimatedTime: { enabled: true, required: false },
  category: { enabled: true, required: false },
  tags: { enabled: true, required: false },
  attachments: { enabled: true, required: false }
};

