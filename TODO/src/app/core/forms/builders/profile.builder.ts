import { NonNullableFormBuilder } from '@angular/forms';
import { appValidators } from '../validators';

export interface ProfileFormValue {
  username: string;
  email: string;
}

export interface AdminUserProfileFormValue extends ProfileFormValue {
  originalEmail?: string;
  roleId: number | null;
}

export function createProfileForm(fb: NonNullableFormBuilder) {
  return fb.group({
    username: fb.control('', { validators: [appValidators.requiredTrim] }),
    email: fb.control('', { validators: [appValidators.requiredTrim, appValidators.email] })
  });
}

export function createAdminUserProfileForm(fb: NonNullableFormBuilder) {
  return fb.group({
    username: fb.control('', { validators: [appValidators.requiredTrim] }),
    email: fb.control('', { validators: [appValidators.requiredTrim, appValidators.email] }),
    originalEmail: fb.control(''),
    roleId: fb.control<number | null>(null, { validators: [appValidators.requiredSelect] })
  });
}

export function profileFormValueFromRaw(raw: ProfileFormValue): ProfileFormValue {
  return {
    username: raw.username.trim(),
    email: raw.email.trim()
  };
}

export function adminUserProfileFormValueFromRaw(raw: AdminUserProfileFormValue): AdminUserProfileFormValue {
  return {
    ...profileFormValueFromRaw(raw),
    originalEmail: raw.originalEmail ? raw.originalEmail.trim() : '',
    roleId: raw.roleId
  };
}
