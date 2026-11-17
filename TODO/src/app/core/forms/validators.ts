import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** Shared validators — change rules here for the whole app. */
export const appValidators = {
  requiredTrim: (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null) {
      return { required: true };
    }
    if (typeof value === 'string' && !value.trim()) {
      return { requiredTrim: true };
    }
    return null;
  },

  email: Validators.email,

  passwordMinLength: Validators.minLength(8),

  /** Required dropdown / select (null, undefined, or empty string). */
  requiredSelect: (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') {
      return { required: true };
    }
    return null;
  }
};

export function passwordsMatch(passwordKey: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    if (!(group instanceof FormGroup)) {
      return null;
    }
    const password = group.get(passwordKey)?.value;
    const confirmation = group.get(confirmKey)?.value;
    if (password == null || confirmation == null || confirmation === '') {
      return null;
    }
    return password === confirmation ? null : { passwordMismatch: true };
  };
}
