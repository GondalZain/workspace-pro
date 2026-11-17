import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkspaceShellComponent } from '../workspace-shell/workspace-shell';
import { WorkspaceHeroComponent } from '../workspace-hero/workspace-hero';
import { TaskStoreService } from '../../services/task-store.service';

@Component({
  selector: 'app-workspace-user-layout',
  standalone: true,
  imports: [CommonModule, WorkspaceShellComponent, WorkspaceHeroComponent],
  templateUrl: './workspace-user-layout.html',
  styleUrl: './workspace-user-layout.css'
})
export class WorkspaceUserLayoutComponent {
  private readonly taskStore = inject(TaskStoreService);
  private readonly router = inject(Router);

  readonly sectionId = input('');
  readonly showShell = input<boolean | null>(null);
  readonly showNav = input<boolean | null>(null);
  readonly showHero = input(false);
  readonly heroBadge = input('');
  readonly heroBadgeMeta = input<string | null>(null);
  readonly heroTitle = input('');
  readonly heroSubtitle = input('');
  readonly heroCompact = input(false);
  readonly contentClass = input('content workspace-content');

  protected readonly shouldShowShell = computed(() => {
    const override = this.showShell();
    if (override !== null) return override;
    return !this.router.url.startsWith('/admin');
  });

  constructor() {
    if (this.taskStore.tasks().length === 0) {
      this.taskStore.refresh();
    }
  }
}
