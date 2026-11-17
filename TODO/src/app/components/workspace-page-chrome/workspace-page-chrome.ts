import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-workspace-page-chrome',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './workspace-page-chrome.html'
})
export class WorkspacePageChromeComponent {
  readonly rootLabel = input.required<string>();
  readonly rootLink = input.required<string>();
  readonly currentLabel = input<string | null>(null);
}
