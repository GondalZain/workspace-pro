import { Component, computed, inject, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { isTaskOwner, PRIORITY_ORDER, Task, TaskFilter, TaskPriority, TaskScope, TaskStatus } from '../../../models/task.model';
import { TaskStoreService } from '../../../services/task-store.service';
import { TaskFiltersComponent } from '../../../components/task-filters/task-filters';
import { TaskListComponent } from '../../../components/task-list/task-list';
import { ActionMenuItem } from '../../../components/action-menu/action-menu';
import { CalendarComponent } from '../../../components/calendar/calendar';
import { TasksWorkspaceSummaryComponent } from '../../../components/tasks-workspace-summary/tasks-workspace-summary';
import { TaskBoardToolbarComponent } from '../../../components/task-board-toolbar/task-board-toolbar';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import { TasksWorkspaceSubnavComponent } from '../../../components/tasks-workspace-subnav/tasks-workspace-subnav';
import { AdminPageHeaderComponent } from '../../../components/admin-page-header/admin-page-header';
import { ROUTES, ROUTE_URL } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WorkspaceUserLayoutComponent,
    TasksWorkspaceSubnavComponent,
    AdminPageHeaderComponent,
    TaskFiltersComponent,
    TaskListComponent,
    CalendarComponent,
    TasksWorkspaceSummaryComponent,
    TaskBoardToolbarComponent
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css'
})
export class DashboardPage {
  protected readonly url = ROUTE_URL;

  private readonly taskStore = inject(TaskStoreService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isAdminRoute = computed(() => this.router.url.startsWith('/admin'));
  protected readonly currentUser = signal(this.auth.getUser());
  protected readonly canCreateTasks = computed(() => this.currentUser()?.permissions?.includes('tasks.create') === true);
  protected readonly isAdmin = computed(() => this.currentUser()?.permissions?.includes('users.manage') === true);
  protected readonly companyName = computed(() => this.currentUser()?.company?.name || 'Workspace');
  protected readonly companyTitle = computed(() => this.currentUser()?.company?.title || 'Tasks');
  protected readonly companyDescription = computed(() => this.currentUser()?.company?.description || '');
  private readonly now = new Date();

  protected readonly calendarYear = model(this.now.getFullYear());
  protected readonly calendarMonthIndex = model(this.now.getMonth());
  protected readonly selectedCalendarDay = model<number | null>(null);

  protected readonly currentMonthYearLabel = computed(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  protected readonly dashboardHeroSubtitle = computed(() => {
    const desc = this.companyDescription();
    if (desc) return desc;
    return this.canCreateTasks()
      ? 'Track your active priorities, upcoming deadlines, and team work in one place.'
      : 'Review your assigned work and upcoming deadlines.';
  });

  protected readonly selectedScope = model<TaskScope>('my');
  protected readonly selectedFilter = model<TaskFilter>('all');
  protected readonly searchTerm = model('');
  protected readonly selectedPriority = model<TaskPriority | 'all'>('all');
  protected readonly selectedStatus = signal<TaskStatus | 'all'>('all');
  protected readonly sortBy = model<'created' | 'due' | 'priority'>('created');
  protected readonly tasks = this.taskStore.tasks;
  protected readonly selectedCalendarDateStr = computed(() => {
    const day = this.selectedCalendarDay();
    if (!day) return null;
    return `${this.calendarYear()}-${String(this.calendarMonthIndex() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

  protected readonly selectedCalendarDateFormatted = computed(() => {
    const day = this.selectedCalendarDay();
    if (!day) return '';
    const date = new Date(this.calendarYear(), this.calendarMonthIndex(), day);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  });

  protected readonly filteredTasks = computed(() => {
    const scope = this.selectedScope();
    const currentUserId = this.currentUser()?.id;
    const currentUsername = this.currentUser()?.username;
    const filter = this.selectedFilter();
    const search = this.searchTerm().toLowerCase();
    const priority = this.selectedPriority();
    const status = this.selectedStatus();
    const selectedDate = this.selectedCalendarDateStr();

    const statuses = this.taskStore.taskStatuses();
    const activeStatusItem = statuses.find((s) => s.name === filter || String(s.id) === filter || s.slug === filter);

    return this.tasks().filter((task) => {
      const isMyTask = isTaskOwner(task, currentUserId, currentUsername);
      const matchesScope = scope === 'all' || (scope === 'my' && isMyTask);
      
      let matchesFilter = false;
      if (filter === 'all') {
        matchesFilter = true;
      } else if (filter === 'active') {
        matchesFilter = !task.completed && task.status !== 'completed';
      } else if (task.status === filter || String(task.statusId) === filter) {
        matchesFilter = true;
      } else if (activeStatusItem) {
        if (task.statusId != null && activeStatusItem.id != null && task.statusId === activeStatusItem.id) {
          matchesFilter = true;
        } else if (task.status === activeStatusItem.name) {
          matchesFilter = true;
        } else if (activeStatusItem.isCompleted && (task.completed || task.status === 'completed')) {
          matchesFilter = true;
        } else if (activeStatusItem.isInitial && !task.status && !task.completed) {
          matchesFilter = true;
        }
      } else if (filter === 'completed') {
        matchesFilter = Boolean(task.completed || task.status === 'completed');
      } else if (filter === 'pending') {
        matchesFilter = task.status === 'pending' || (!task.status && !task.completed);
      } else if (filter === 'in-progress') {
        matchesFilter = task.status === 'in-progress';
      }
      const matchesSearch = !search || `${task.title} ${task.description} ${task.category} ${task.tags.join(' ')}`.toLowerCase().includes(search);
      const matchesDate =
        !selectedDate || !task.dueDate || task.dueDate === selectedDate;
      return matchesScope && matchesFilter && matchesSearch && matchesDate && (priority === 'all' || task.priority === priority) && (status === 'all' || task.status === status);
    }).sort((first, second) => {
      if (this.sortBy() === 'priority') return PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority];
      if (this.sortBy() === 'due') return (first.dueDate || '9999').localeCompare(second.dueDate || '9999');
      return second.createdAt.localeCompare(first.createdAt);
    });
  });

  private getTodayDateStrings(): string[] {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const systemToday = `${y}-${m}-${d}`;
    return Array.from(new Set([systemToday, '2026-09-09']));
  }

  protected isTaskDueToday(task: Task): boolean {
    if (!task.dueDate || task.completed || task.status === 'completed') return false;
    return this.getTodayDateStrings().includes(task.dueDate);
  }

  protected readonly myTasks = computed(() => {
    const currentUserId = this.currentUser()?.id;
    const currentUsername = this.currentUser()?.username;
    return this.tasks().filter((task) => isTaskOwner(task, currentUserId, currentUsername));
  });

  protected readonly completedCount = computed(() => this.myTasks().filter((task) => task.completed).length);
  protected readonly upcomingTasks = computed(() =>
    this.myTasks()
      .filter((task) => task.dueDate && !task.completed && task.status !== 'completed')
      .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
      .slice(0, 3)
  );

  protected readonly taskPanelActions = computed<ActionMenuItem[]>(() => [
    ...(this.canCreateTasks() ? [{ id: 'new-task', label: 'Create task' }] : []),
    ...(this.canCreateTasks() ? [{ id: 'clear-completed', label: 'Clear completed', destructive: true }] : [])
  ]);

  protected readonly upcomingActions: ActionMenuItem[] = [
    { id: 'show-all', label: 'Show all tasks' },
    { id: 'sort-due', label: 'Sort by due date' }
  ];

  constructor() {
    this.taskStore.setActiveTaskId(null);
    this.taskStore.refresh();
  }

  protected openTaskDetail(task: Task): void {
    this.taskStore.setActiveTaskId(task.id);
    this.taskStore.setTaskReturnContext('dashboard');
    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTaskDetail : ROUTES.taskDetail);
  }

  protected editTask(task: Task): void {
    this.taskStore.setActiveTaskId(task.id);
    this.taskStore.setEditOrigin('dashboard');
    this.taskStore.setTaskReturnContext('dashboard');
    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTaskEdit : ROUTES.taskEdit);
  }

  protected openEditor(): void {
    this.taskStore.setActiveTaskId(null);
    this.taskStore.setEditOrigin('dashboard');
    this.taskStore.setTaskReturnContext('dashboard');
    this.router.navigate(this.isAdminRoute() ? ROUTES.adminTaskNew : ROUTES.taskNew);
  }

  protected toggleTask(id: number): void {
    this.taskStore.toggle(id);
  }

  protected onStatusChanged(event: { id: number; status: TaskStatus }): void {
    this.taskStore.update(event.id, { status: event.status });
  }

  protected deleteTask(id: number): void {
    this.taskStore.remove(id);
  }

  protected clearCompleted(): void {
    this.taskStore.clearCompleted();
  }

  protected setStatus(value: string): void {
    this.selectedStatus.set(value as TaskStatus | 'all');
  }

  protected selectPanelAction(action: string): void {
    if (action === 'new-task') this.openEditor();
    if (action === 'clear-completed') this.clearCompleted();
  }

  protected selectUpcomingAction(action: string): void {
    if (action === 'show-all') this.resetFilters();
    if (action === 'sort-due') this.sortBy.set('due');
  }

  protected selectMetricAction(action: string): void {
    const [card] = action.split(':');
    if (card === 'total') this.resetFilters();
    if (card === 'completed') {
      this.selectedFilter.set('completed');
      this.selectedCalendarDay.set(null);
    }
    if (card === 'pending') {
      this.selectedFilter.set('active');
      this.selectedCalendarDay.set(null);
    }
    if (card === 'due-today') {
      this.selectedFilter.set('active');
      const todayTasks = this.tasks().filter((t) => this.isTaskDueToday(t));
      if (todayTasks.length > 0 && todayTasks[0].dueDate) {
        const [y, m, d] = todayTasks[0].dueDate.split('-').map(Number);
        if (y && m && d) {
          this.calendarYear.set(y);
          this.calendarMonthIndex.set(m - 1);
          this.selectedCalendarDay.set(d);
        }
      }
    }
    document.querySelector('#tasks')?.scrollIntoView({ behavior: 'smooth' });
  }

  protected clearCalendarSelection(): void {
    this.selectedCalendarDay.set(null);
  }

  protected resetFilters(): void {
    this.selectedScope.set('my');
    this.selectedFilter.set('all');
    this.searchTerm.set('');
    this.selectedPriority.set('all');
    this.selectedStatus.set('all');
    this.sortBy.set('created');
    this.selectedCalendarDay.set(null);
  }
}
