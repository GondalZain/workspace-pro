import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ROUTE_URL } from '../../core/routing/route-paths';

@Component({
  selector: 'app-tasks-workspace-subnav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './tasks-workspace-subnav.html',
  styleUrl: './tasks-workspace-subnav.css'
})
export class TasksWorkspaceSubnavComponent {
  private readonly router = inject(Router);
  protected readonly url = ROUTE_URL;

  protected readonly isAdmin = computed(() => this.router.url.startsWith('/admin'));
  protected readonly taskListLink = computed(() => (this.isAdmin() ? this.url.adminTasks : this.url.dashboardTasks));
  protected readonly kanbanLink = computed(() => (this.isAdmin() ? this.url.adminTasksKanban : this.url.dashboardKanban));
}
