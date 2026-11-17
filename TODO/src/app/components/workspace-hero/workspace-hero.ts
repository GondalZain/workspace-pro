import { Component, input } from '@angular/core';

@Component({
  selector: 'app-workspace-hero',
  standalone: true,
  templateUrl: './workspace-hero.html',
  styleUrl: './workspace-hero.css'
})
export class WorkspaceHeroComponent {
  readonly badge = input('');
  readonly badgeMeta = input<string | null>(null);
  readonly title = input('');
  readonly subtitle = input('');
  readonly compact = input(false);
}
