import { Component, inject, input, model } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { createSearchForm, linkFormControlToModel } from '../../core/forms';

@Component({
  selector: 'app-search-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="app-search-field" [class.app-search-field--with-icon]="showIcon()" [formGroup]="form">
      @if (showIcon()) {
        <svg
          class="app-search-field__icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      }
      <input
        [class]="inputClass()"
        type="search"
        formControlName="q"
        [placeholder]="placeholder()"
        [attr.aria-label]="ariaLabel()"
      />
    </div>
  `,
  styles: `
    .app-search-field {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }
    .app-search-field__icon {
      position: absolute;
      left: 0.75rem;
      pointer-events: none;
      opacity: 0.55;
    }
    .app-search-field--with-icon .app-search-field__input {
      padding-left: 2.25rem;
    }
    .app-search-field__input {
      width: 100%;
      box-sizing: border-box;
    }
  `
})
export class SearchFieldComponent {
  /** Two-way: `[(query)]="searchQuery"`. */
  readonly query = model('');

  readonly placeholder = input('Search…');
  readonly ariaLabel = input('Search');
  readonly showIcon = input(true);
  /** Extra classes on the search input (e.g. `proj-search__input`). */
  readonly inputClass = input('app-search-field__input');

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = createSearchForm(this.fb);

  constructor() {
    linkFormControlToModel(this.form.controls.q, this.query);
  }
}
