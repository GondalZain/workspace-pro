import { FormGroup } from '@angular/forms';

/** Patch only when values differ — avoids cursor jumps while typing. */
export function patchFormIfChanged<T extends object>(form: FormGroup, next: Partial<T>): void {
  const current = form.getRawValue() as T;
  const patch: Partial<T> = {};

  for (const key of Object.keys(next) as (keyof T)[]) {
    if (current[key] !== next[key]) {
      patch[key] = next[key];
    }
  }

  if (Object.keys(patch).length > 0) {
    form.patchValue(patch, { emitEvent: false });
  }
}
