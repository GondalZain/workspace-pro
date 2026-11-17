import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import { WorkspacePageChromeComponent } from '../../../components/workspace-page-chrome/workspace-page-chrome';
import { TaskDetailComponent } from '../../../components/task-detail/task-detail';
import { TaskStoreService } from '../../../services/task-store.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Task } from '../../../models/task.model';
import { projectDetailNavById } from '../../../components/projects';
import { ProjectStoreService } from '../../../services/project-store.service';
import { ROUTES, ROUTE_URL } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-task-detail-page',
  standalone: true,
  imports: [CommonModule, WorkspaceUserLayoutComponent, WorkspacePageChromeComponent, TaskDetailComponent],
  templateUrl: './task-detail.page.html'
})
export class TaskDetailPage {
  private readonly router = inject(Router);
  private readonly taskStore = inject(TaskStoreService);
  private readonly projectStore = inject(ProjectStoreService);
  private readonly auth = inject(AuthService);

  protected readonly url = ROUTE_URL;
  constructor() {
    if (this.taskStore.tasks().length === 0) {
      this.taskStore.refresh();
    }
  }

  protected readonly isAdminRoute = computed(() => this.router.url.startsWith('/admin'));

  protected readonly chromeRootLabel = computed(() => {
    if (this.taskStore.taskReturnOrigin() === 'project') return 'Projects';
    return 'Tasks';
  });

  protected readonly chromeRootLink = computed(() => {
    if (this.isAdminRoute()) {
      return this.taskStore.taskReturnOrigin() === 'project' ? this.url.adminProjects : this.url.adminTasks;
    }
    if (this.taskStore.taskReturnOrigin() === 'project') {
      return this.url.dashboardProjects;
    }
    return this.url.dashboardTasks;
  });

  protected readonly task = computed<Task | null>(() => {
    const id = this.taskStore.activeTaskId();
    if (id == null) return null;
    return this.taskStore.tasks().find((t) => t.id === id) ?? null;
  });

  protected canEdit(): boolean {
    const user = this.auth.getUser();
    const t = this.task();
    if (!user || !t) return false;
    if (user.permissions?.includes('users.manage')) return true;
    return (user.id != null && Number(t.userId) === Number(user.id)) ||
      (Boolean(user.username) && Boolean(t.creatorUsername) && t.creatorUsername === user.username);
  }

  protected onClose(): void {
    this.taskStore.setActiveTaskId(null);
    const origin = this.taskStore.taskReturnOrigin();
    const isAdmin = this.router.url.startsWith('/admin') || this.taskStore.taskReturnIsAdmin();
    if (origin === 'kanban') {
      this.router.navigate(ROUTES.dashboardKanban);
    } else if (origin === 'calendar') {
      this.router.navigate(ROUTES.dashboardCalendar);
    } else if (origin === 'project') {
      const projectId = this.taskStore.taskReturnProjectId();
      if (projectId !== null) {
        this.router.navigate(projectDetailNavById(this.projectStore.projects(), projectId, isAdmin));
      } else {
        this.router.navigate(isAdmin ? ROUTES.adminProjects : ROUTES.dashboardProjects);
      }
    } else {
      this.router.navigate(isAdmin ? ROUTES.adminTasks : ROUTES.dashboardTasks);
    }
  }

  protected onEdit(task: Task): void {
    this.taskStore.setActiveTaskId(task.id);
    this.taskStore.setEditOrigin('detail');
    const isAdmin = this.router.url.startsWith('/admin') || this.taskStore.taskReturnIsAdmin();
    this.router.navigate(isAdmin ? ROUTES.adminTaskEdit : ROUTES.taskEdit);
  }
}
