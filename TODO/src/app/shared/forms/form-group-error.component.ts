import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { merge, Subscription } from 'rxjs';
import { groupErrorMessage } from '../../core/forms';

@Component({
  selector: 'app-form-group-error',
  standalone: true,
  template: `
    @if (visibleMessage()) {
      <p class="form-field-error" role="alert">{{ visibleMessage() }}</p>
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
export class FormGroupErrorComponent {
  readonly group = input.required<AbstractControl>();
  readonly errorKey = input.required<string>();
  readonly errorText = input.required<string>();
  readonly showAfterSubmit = input(false);

  private readonly version = signal(0);

  constructor() {
    effect((onCleanup) => {
      const group = this.group();
      const sub: Subscription = merge(group.statusChanges, group.valueChanges).subscribe(() => {
        untracked(() => this.version.update((value) => value + 1));
      });
      onCleanup(() => sub.unsubscribe());
    });

    effect(() => {
      this.showAfterSubmit();
      untracked(() => this.version.update((value) => value + 1));
    });
  }

  protected readonly visibleMessage = computed(() => {
    this.version();
    const group = this.group();
    const visible = this.showAfterSubmit() || group.touched || group.dirty;
    return groupErrorMessage(group, this.errorKey(), this.errorText(), { visible });
  });
}
