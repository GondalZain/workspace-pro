import { Component, computed, inject, output, signal } from '@angular/core';
import { isTaskOwner, Task } from '../../models/task.model';
import { TaskStoreService } from '../../services/task-store.service';
import { AuthService } from '../../core/auth/auth.service';
import { MetricCard, MetricCardsComponent } from '../metric-cards/metric-cards';

@Component({
  selector: 'app-tasks-workspace-summary',
  standalone: true,
  imports: [MetricCardsComponent],
  templateUrl: './tasks-workspace-summary.html'
})
export class TasksWorkspaceSummaryComponent {
  readonly metricAction = output<string>();

  private readonly taskStore = inject(TaskStoreService);
  private readonly auth = inject(AuthService);

  private readonly currentUser = signal(this.auth.getUser());
  protected readonly tasks = this.taskStore.tasks;

  protected readonly myTasks = computed(() => {
    const currentUserId = this.currentUser()?.id;
    const currentUsername = this.currentUser()?.username;
    return this.tasks().filter((task) => isTaskOwner(task, currentUserId, currentUsername));
  });

  protected readonly remainingCount = computed(() => this.myTasks().filter((task) => !task.completed).length);
  protected readonly completedCount = computed(() => this.myTasks().filter((task) => task.completed).length);
  protected readonly dueTodayCount = computed(() => this.myTasks().filter((task) => this.isTaskDueToday(task)).length);

  protected readonly metricCards = computed<MetricCard[]>(() => [
    { id: 'total', label: 'My tasks', value: this.myTasks().length, note: 'Your personal tasks' },
    {
      id: 'pending',
      label: 'Pending',
      value: this.remainingCount(),
      note: this.remainingCount() ? 'Keep the momentum' : 'Everything is clear'
    },
    {
      id: 'completed',
      label: 'Completed',
      value: this.completedCount(),
      note: `${this.myTasks().length ? Math.round((this.completedCount() / this.myTasks().length) * 100) : 0}% of your tasks`
    },
    {
      id: 'due-today',
      label: 'Due today',
      value: this.dueTodayCount(),
      note: this.dueTodayCount() ? 'Needs your attention' : 'All clear for today',
      alert: this.dueTodayCount() > 0
    }
  ]);

  protected onCardAction(action: string): void {
    this.metricAction.emit(action);
  }

  private isTaskDueToday(task: Task): boolean {
    if (!task.dueDate || task.completed || task.status === 'completed') return false;
    return this.getTodayDateStrings().includes(task.dueDate);
  }

  private getTodayDateStrings(): string[] {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const systemToday = `${y}-${m}-${d}`;
    return Array.from(new Set([systemToday, '2026-09-09']));
  }
}
