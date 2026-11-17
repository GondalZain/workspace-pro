import { NonNullableFormBuilder } from '@angular/forms';
import { appValidators } from '../validators';

export interface RoleFormValue {
  name: string;
  description: string;
  permissions: string[];
}

export function createRoleForm(fb: NonNullableFormBuilder) {
  return fb.group({
    name: fb.control('', { validators: [appValidators.requiredTrim] }),
    description: fb.control(''),
    permissions: fb.control<string[]>([])
  });
}

export function roleFormValueFromRaw(raw: RoleFormValue): RoleFormValue {
  return {
    name: raw.name.trim(),
    description: raw.description.trim(),
    permissions: raw.permissions
  };
}

export function patchRoleForm(
  form: ReturnType<typeof createRoleForm>,
  value: RoleFormValue
): void {
  form.patchValue(
    {
      name: value.name,
      description: value.description,
      permissions: [...value.permissions]
    },
    { emitEvent: false }
  );
}
