import { NonNullableFormBuilder } from '@angular/forms';
import { appValidators, passwordsMatch } from '../validators';

export interface LoginFormValue {
  email: string;
  password: string;
}

export interface RegistrationFormValue {
  username: string;
  email: string;
  password: string;
  confirmation: string;
}

export function createLoginForm(fb: NonNullableFormBuilder) {
  return fb.group({
    email: fb.control('', { validators: [appValidators.requiredTrim, appValidators.email] }),
    password: fb.control('', { validators: [appValidators.requiredTrim] })
  });
}

export function createRegistrationForm(fb: NonNullableFormBuilder) {
  return fb.group(
    {
      username: fb.control('', { validators: [appValidators.requiredTrim] }),
      email: fb.control('', { validators: [appValidators.requiredTrim, appValidators.email] }),
      password: fb.control('', { validators: [appValidators.requiredTrim, appValidators.passwordMinLength] }),
      confirmation: fb.control('', { validators: [appValidators.requiredTrim] })
    },
    { validators: [passwordsMatch('password', 'confirmation')] }
  );
}

export function loginFormValueFromRaw(raw: LoginFormValue): LoginFormValue {
  return {
    email: raw.email.trim(),
    password: raw.password
  };
}

export function registrationFormValueFromRaw(raw: RegistrationFormValue): RegistrationFormValue {
  return {
    username: raw.username.trim(),
    email: raw.email.trim(),
    password: raw.password,
    confirmation: raw.confirmation
  };
}
