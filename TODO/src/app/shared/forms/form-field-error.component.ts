import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { merge, Subscription } from 'rxjs';
import { controlErrorMessage } from '../../core/forms';

@Component({
  selector: 'app-form-field-error',
  standalone: true,
  template: `
    @if (message()) {
      <p class="form-field-error" role="alert">{{ message() }}</p>
    }
  `,
  styles: `
    .form-field-error {
      margin: 0.25rem 0 0;
      font-size: 0.78rem;
      font-weight: 600;
      color: #dc2626;
    }
  `
})
export class FormFieldErrorComponent {
  readonly control = input.required<AbstractControl>();
  readonly fieldLabel = input('This field');
  /** True after a failed submit — shows errors even if the field was not blurred. */
  readonly showAfterSubmit = input(false);

  private readonly version = signal(0);

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      const sub: Subscription = merge(control.statusChanges, control.valueChanges).subscribe(() => {
        untracked(() => this.version.update((value) => value + 1));
      });
      onCleanup(() => sub.unsubscribe());
    });

    effect(() => {
      this.showAfterSubmit();
      untracked(() => this.version.update((value) => value + 1));
    });
  }

  protected readonly message = computed(() => {
    this.version();
    const control = this.control();
    const visible = this.showAfterSubmit() || control.touched || control.dirty;
    return controlErrorMessage(control, this.fieldLabel(), { visible });
  });
}
