import { Component, computed, inject, input, model, output } from '@angular/core';
import { TaskFilter, TaskScope } from '../../models/task.model';
import { TaskStoreService } from '../../services/task-store.service';

@Component({
  selector: 'app-task-filters',
  standalone: true,
  templateUrl: './task-filters.html',
  styleUrl: './task-filters.css'
})
export class TaskFiltersComponent {
  private readonly taskStore = inject(TaskStoreService);

  readonly selectedScope = model<TaskScope>('all');
  readonly selectedFilter = model.required<TaskFilter>();

  readonly hasCompletedTasks = input(false);
  readonly completedCleared = output<void>();

  // Dynamic statuses from company's active pipeline
  protected readonly availableStatuses = computed(() => {
    const statuses = this.taskStore.taskStatuses();
    if (statuses && statuses.length > 0) {
      return statuses;
    }
    return [
      { id: 1, name: 'To Do', slug: 'pending', color: '#dc2626', sortOrder: 1, isInitial: true, isCompleted: false, isDefault: true },
      { id: 2, name: 'In Progress', slug: 'in-progress', color: '#2563eb', sortOrder: 2, isInitial: false, isCompleted: false, isDefault: true },
      { id: 3, name: 'Completed', slug: 'completed', color: '#16a34a', sortOrder: 3, isInitial: false, isCompleted: true, isDefault: true }
    ];
  });

  protected setScope(scope: TaskScope): void {
    this.selectedScope.set(scope);
  }

  protected setFilter(filter: TaskFilter): void {
    this.selectedFilter.set(filter);
  }
}
