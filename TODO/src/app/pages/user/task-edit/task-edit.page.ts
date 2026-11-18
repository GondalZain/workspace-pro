import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import { WorkspacePageChromeComponent } from '../../../components/workspace-page-chrome/workspace-page-chrome';
import { TaskEditorComponent } from '../../../components/task-editor/task-editor';
import { TaskStoreService } from '../../../services/task-store.service';
import { NewTask, Task } from '../../../models/task.model';
import { projectDetailNavById } from '../../../components/projects';
import { ProjectStoreService } from '../../../services/project-store.service';
import { ROUTES, ROUTE_URL } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-task-edit-page',
  standalone: true,
  imports: [CommonModule, WorkspaceUserLayoutComponent, WorkspacePageChromeComponent, TaskEditorComponent],
  templateUrl: './task-edit.page.html'
})
export class TaskEditPage {
  private readonly router = inject(Router);
  private readonly taskStore = inject(TaskStoreService);
  private readonly projectStore = inject(ProjectStoreService);

  protected readonly url = ROUTE_URL;
  protected readonly isNewTask = computed(() =>
    this.router.url.split('?')[0].includes('/tasks/new')
  );

  constructor() {
    if (this.isNewTask()) {
      this.taskStore.setActiveTaskId(null);
    }
    if (this.taskStore.tasks().length === 0) {
      this.taskStore.refresh();
    }
  }

  protected readonly task = computed<Task | null>(() => {
    if (this.isNewTask()) return null;
    const id = this.taskStore.activeTaskId();
    if (id == null) return null;
    return this.taskStore.tasks().find((t) => t.id === id) ?? null;
  });

  protected readonly backLabel = computed(() =>
    this.taskStore.editOrigin() === 'detail' ? 'Back to task' : 'Back to dashboard'
  );

  protected readonly newTaskProjectId = computed(() =>
    this.isNewTask() ? this.taskStore.taskReturnProjectId() : null
  );

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

  private navigateBackToOrigin(): void {
    const editOrigin = this.taskStore.editOrigin();
    const returnOrigin = this.taskStore.taskReturnOrigin();
    const taskId = this.taskStore.activeTaskId();

    if (returnOrigin === 'project') {
      const projectId = this.taskStore.taskReturnProjectId();
      const isAdmin = this.taskStore.taskReturnIsAdmin();
      if (projectId !== null) {
        this.router.navigate(projectDetailNavById(this.projectStore.projects(), projectId, isAdmin));
        return;
      }
      this.router.navigate(isAdmin ? ROUTES.adminProjects : ROUTES.dashboardProjects);
      return;
    }

    if (returnOrigin === 'kanban') {
      this.router.navigate(this.isAdminRoute() ? ROUTES.adminTasksKanban : ROUTES.dashboardKanban);
      return;
    }

    if (returnOrigin === 'calendar') {
      this.router.navigate(ROUTES.dashboardCalendar);
      return;
    }

    if (editOrigin === 'detail' && taskId !== null) {
      this.router.navigate(this.isAdminRoute() ? ROUTES.adminTaskDetail : ROUTES.taskDetail);
      return;
    }

    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTasks : ROUTES.dashboardTasks);
  }

  protected onSaved(taskData: NewTask): void {
    if (this.isNewTask()) {
      this.taskStore.add(taskData, () => this.navigateBackToOrigin());
      return;
    }

    const current = this.task();
    const targetId = current?.id ?? this.taskStore.activeTaskId();

    if (targetId) {
      this.taskStore.update(targetId, taskData);
      this.navigateBackToOrigin();
      return;
    }

    this.taskStore.add(taskData, () => this.navigateBackToOrigin());
  }

  protected onCancelled(): void {
    this.navigateBackToOrigin();
  }
}
