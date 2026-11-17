import { DestroyRef, effect, inject, ModelSignal, untracked } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { patchFormIfChanged } from './patch-form.util';

/** Sync one control with a `model()` — use inside components that wrap a single input. */
export function linkFormControlToModel<T>(
  control: FormControl<T>,
  model: ModelSignal<T>,
  destroyRef = inject(DestroyRef)
): void {
  effect(() => {
    const value = model();
    untracked(() => {
      if (control.value !== value) {
        control.patchValue(value, { emitEvent: false });
      }
    });
  });

  const sub = control.valueChanges.subscribe((value) => {
    if (model() !== value) {
      model.set(value);
    }
  });
  destroyRef.onDestroy(() => sub.unsubscribe());
}

type ModelFieldMap<T extends Record<string, unknown>> = {
  [K in keyof T]?: ModelSignal<T[K]>;
};

/**
 * Syncs reactive form controls with component `model()` inputs for two-way parent binding.
 *
 * - Parent: `[(searchTerm)]="searchTerm"` on the child selector
 * - Child: `readonly searchTerm = model('')` + this helper in the constructor
 *
 * Call only from an injection context (e.g. component constructor).
 */
export function linkFormGroupToModels<T extends Record<string, unknown>>(
  form: FormGroup,
  models: ModelFieldMap<T>,
  destroyRef = inject(DestroyRef)
): void {
  const keys = Object.keys(models) as (keyof T)[];

  effect(() => {
    const patch: Partial<T> = {};
    for (const key of keys) {
      const model = models[key];
      if (!model) continue;
      patch[key] = model();
    }
    untracked(() => patchFormIfChanged(form, patch));
  });

  for (const key of keys) {
    const model = models[key];
    if (!model) continue;
    const control = form.get(String(key)) as FormControl<T[typeof key]> | null;
    if (!control) continue;

    const sub = control.valueChanges.subscribe((value) => {
      if (model() !== value) {
        model.set(value);
      }
    });
    destroyRef.onDestroy(() => sub.unsubscribe());
  }
}
