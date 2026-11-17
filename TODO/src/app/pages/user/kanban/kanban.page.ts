import { Component, computed, inject, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { isTaskOwner, NewTask, Task, TaskPriority, TaskScope, TaskStatus } from '../../../models/task.model';
import { TaskStoreService } from '../../../services/task-store.service';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import { TasksWorkspaceSubnavComponent } from '../../../components/tasks-workspace-subnav/tasks-workspace-subnav';
import { TasksWorkspaceSummaryComponent } from '../../../components/tasks-workspace-summary/tasks-workspace-summary';
import { KanbanViewComponent } from '../../../components/kanban';
import { AdminPageHeaderComponent } from '../../../components/admin-page-header/admin-page-header';
import { ROUTES } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-user-kanban-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WorkspaceUserLayoutComponent,
    TasksWorkspaceSubnavComponent,
    TasksWorkspaceSummaryComponent,
    AdminPageHeaderComponent,
    KanbanViewComponent
  ],
  templateUrl: './kanban.page.html',
  styleUrl: '../dashboard/dashboard.page.css'
})
export class UserKanbanPage {
  private readonly taskStore = inject(TaskStoreService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isAdminRoute = computed(() => this.router.url.startsWith('/admin'));
  protected readonly currentUser = computed(() => this.auth.userSignal());
  protected readonly canCreateTasks = computed(() => this.currentUser()?.permissions?.includes('tasks.create') === true);
  protected readonly isAdmin = computed(() => this.currentUser()?.permissions?.includes('users.manage') === true);

  protected readonly searchTerm = model('');
  protected readonly selectedPriority = model<'all' | TaskPriority>('all');
  protected readonly selectedScope = model<TaskScope>('all');

  protected readonly tasks = this.taskStore.tasks;

  protected readonly currentMonthYearLabel = computed(() =>
    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );
  protected readonly companyName = computed(() => this.currentUser()?.company?.name || 'Workspace');
  protected readonly companyDescription = computed(() => this.currentUser()?.company?.description || '');
  protected readonly kanbanHeroSubtitle = computed(() => {
    const desc = this.companyDescription();
    if (desc) return desc;
    return 'Interactive board — drag and drop task cards across pipeline stages.';
  });

  protected readonly filteredTasks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const priority = this.selectedPriority();
    const scope = this.selectedScope();
    const currentUserId = this.currentUser()?.id;
    const currentUsername = this.currentUser()?.username;

    return this.tasks().filter((task) => {
      if (scope === 'my') {
        const isMyTask = isTaskOwner(task, currentUserId, currentUsername);
        if (!isMyTask) return false;
      }

      if (priority !== 'all' && task.priority !== priority) return false;

      if (term) {
        const titleMatch = task.title.toLowerCase().includes(term);
        const descMatch = (task.description || '').toLowerCase().includes(term);
        const catMatch = (task.category || '').toLowerCase().includes(term);
        const tagMatch = (task.tags || []).some((t) => t.toLowerCase().includes(term));
        if (!titleMatch && !descMatch && !catMatch && !tagMatch) return false;
      }

      return true;
    });
  });

  constructor() {
    this.taskStore.refresh();
  }

  protected openTaskDetail(task: Task): void {
    this.taskStore.setEditOrigin('kanban');
    this.taskStore.setTaskReturnContext('kanban');
    this.taskStore.setActiveTaskId(task.id);
    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTaskDetail : ROUTES.taskDetail);
  }

  protected editTask(task: Task): void {
    this.taskStore.setActiveTaskId(task.id);
    this.taskStore.setEditOrigin('kanban');
    this.taskStore.setTaskReturnContext('kanban');
    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTaskEdit : ROUTES.taskEdit);
  }

  protected deleteTask(id: number): void {
    this.taskStore.remove(id);
  }

  protected onTaskStatusChanged(event: { id: number; status: TaskStatus }): void {
    this.taskStore.update(event.id, { status: event.status });
  }

  protected addTask(task: NewTask | string): void {
    this.taskStore.add(task);
  }

  protected onQuickAddColumn(_status: TaskStatus): void {
    this.taskStore.setEditOrigin('kanban');
    this.taskStore.setTaskReturnContext('kanban');
    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTaskNew : ROUTES.taskNew);
  }

  /** Metric cards apply filters on the list view. */
  protected onMetricAction(_action: string): void {
    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTasks : ROUTES.dashboardTasks);
  }
}
