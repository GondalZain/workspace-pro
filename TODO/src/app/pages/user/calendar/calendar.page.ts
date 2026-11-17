import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Task, TaskStatus } from '../../../models/task.model';
import { TaskStoreService } from '../../../services/task-store.service';
import { CalendarViewComponent } from '../../../components/calendar';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import { AuthService } from '../../../core/auth/auth.service';
import { ROUTES, ROUTE_URL } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-user-calendar-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WorkspaceUserLayoutComponent,
    CalendarViewComponent
  ],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.css'
})
export class UserCalendarPage {
  protected readonly url = ROUTE_URL;

  private readonly taskStore = inject(TaskStoreService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = signal(this.auth.getUser());
  protected readonly canCreateTasks = computed(() => this.currentUser()?.permissions?.includes('tasks.create') === true);
  protected readonly isAdmin = computed(() => this.currentUser()?.permissions?.includes('users.manage') === true);
  protected readonly tasks = this.taskStore.tasks;

  constructor() {
    this.taskStore.refresh();
  }

  protected openTaskDetail(task: Task): void {
    this.taskStore.setEditOrigin('calendar');
    this.taskStore.setTaskReturnContext('calendar');
    this.taskStore.setActiveTaskId(task.id);
    this.router.navigate(ROUTES.taskDetail);
  }

  protected editTask(task: Task): void {
    this.taskStore.setActiveTaskId(task.id);
    this.taskStore.setEditOrigin('calendar');
    this.taskStore.setTaskReturnContext('calendar');
    this.router.navigate(ROUTES.taskEdit);
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
}
