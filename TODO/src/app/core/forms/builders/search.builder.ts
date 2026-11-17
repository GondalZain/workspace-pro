import { NonNullableFormBuilder } from '@angular/forms';

export interface SearchFormValue {
  q: string;
}

/** Single-field search/filter box used in lists and admin tables. */
export function createSearchForm(fb: NonNullableFormBuilder, initialQuery = '') {
  return fb.group({
    q: fb.control(initialQuery)
  });
}
