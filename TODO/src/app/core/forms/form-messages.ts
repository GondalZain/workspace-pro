import { AbstractControl } from '@angular/forms';

const DEFAULT_LABEL = 'This field';

export function controlErrorMessage(
  control: AbstractControl | null,
  fieldLabel = DEFAULT_LABEL,
  options?: { visible?: boolean }
): string | null {
  if (!control) {
    return null;
  }

  const shouldShow = options?.visible ?? (control.touched || control.dirty);
  if (!shouldShow || !control.invalid) {
    return null;
  }

  if (control.hasError('required') || control.hasError('requiredTrim')) {
    return `${fieldLabel} is required.`;
  }

  if (control.hasError('email')) {
    return 'Enter a valid email address.';
  }

  if (control.hasError('minlength')) {
    const requiredLength = control.getError('minlength')?.requiredLength as number | undefined;
    return requiredLength
      ? `Must be at least ${requiredLength} characters.`
      : 'Value is too short.';
  }

  return null;
}

export function groupErrorMessage(
  group: AbstractControl | null,
  errorKey: string,
  message: string,
  options?: { visible?: boolean }
): string | null {
  if (!group) {
    return null;
  }

  const shouldShow = options?.visible ?? (group.touched || group.dirty);
  if (!shouldShow) {
    return null;
  }

  return group.hasError(errorKey) ? message : null;
}
