export type CustomFieldEntityType = 'project' | 'task';

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'email'
  | 'phone'
  | 'url'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'textarea';

export interface CustomFieldDefinition {
  id: number;
  companyId: number;
  entityType: CustomFieldEntityType;
  fieldKey: string;
  fieldName: string;
  fieldType: CustomFieldType;
  options: string[];
  placeholder?: string;
  description?: string;
  isRequired: boolean;
  orderIndex: number;
  isActive?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomFieldDto {
  entityType: CustomFieldEntityType;
  fieldName: string;
  fieldKey?: string;
  fieldType: CustomFieldType;
  options?: string[];
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
}

export interface UpdateCustomFieldDto {
  fieldName?: string;
  fieldType?: CustomFieldType;
  options?: string[];
  placeholder?: string;
  description?: string;
  isRequired?: boolean;
  orderIndex?: number;
}

