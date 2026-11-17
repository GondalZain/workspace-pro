import { FormGroup } from '@angular/forms';

/** Call on submit: marks all fields touched and returns whether the form is valid. */
export function submitFormGroup(form: FormGroup): boolean {
  form.markAllAsTouched();
  return form.valid;
}
