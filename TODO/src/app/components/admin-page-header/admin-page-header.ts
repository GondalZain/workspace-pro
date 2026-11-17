import { Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  templateUrl: './admin-page-header.html',
  styleUrl: './admin-page-header.css'
})
export class AdminPageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input('');
}
