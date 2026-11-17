import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspacePageChromeComponent } from '../../workspace-page-chrome/workspace-page-chrome';
import { ROUTE_URL } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-project-page-chrome',
  standalone: true,
  imports: [WorkspacePageChromeComponent],
  templateUrl: './project-page-chrome.html'
})
export class ProjectPageChromeComponent {
  private readonly router = inject(Router);

  readonly currentLabel = input<string | null>(null);

  protected readonly url = ROUTE_URL;

  protected readonly rootLink = computed(() =>
    this.router.url.startsWith('/admin') ? this.url.adminProjects : this.url.dashboardProjects
  );
}
