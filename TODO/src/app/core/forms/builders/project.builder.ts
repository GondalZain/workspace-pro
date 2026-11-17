import { NonNullableFormBuilder } from '@angular/forms';
import { appValidators } from '../validators';

export interface ProjectFormValue {
  title: string;
  description: string;
  defaultAssigneeId?: number | null;
  formTemplateId?: number | null;
  customFields?: Record<string, any>;
}

export function createProjectForm(fb: NonNullableFormBuilder) {
  return fb.group({
    title: fb.control('', { validators: [appValidators.requiredTrim] }),
    description: fb.control('')
  });
}

export function projectFormValueFromRaw(raw: ProjectFormValue): ProjectFormValue {
  return {
    title: raw.title.trim(),
    description: raw.description.trim()
  };
}
