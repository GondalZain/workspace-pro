import { Component, computed, inject, input, output } from '@angular/core';
import { KanbanTaskDropEvent } from '../../models/kanban.model';
import { Task, TaskStatus } from '../../models/task.model';
import { KanbanColumnComponent } from '../kanban-column/kanban-column';
import { TaskStoreService } from '../../services/task-store.service';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [KanbanColumnComponent],
  templateUrl: './kanban-board.html',
  styleUrl: './kanban-board.css'
})
export class KanbanBoardComponent {
  private readonly taskStore = inject(TaskStoreService);

  readonly tasks = input.required<Task[]>();
  readonly currentUserId = input<number | null | undefined>(null);
  readonly currentUsername = input<string | null | undefined>(null);
  readonly isAdmin = input(false);

  readonly taskSelected = output<Task>();
  readonly taskEdited = output<Task>();
  readonly taskDeleted = output<number>();
  readonly quickAddClicked = output<TaskStatus>();
  readonly taskStatusChanged = output<{ id: number; status: TaskStatus }>();

  // Dynamic statuses from active company pipeline
  protected readonly boardColumns = computed(() => {
    const rawStatuses = this.taskStore.taskStatuses();
    const statuses = rawStatuses.length > 0 ? rawStatuses : [
      { id: 1, name: 'To Do', color: '#dc2626', sortOrder: 1, isInitial: true, isCompleted: false, isDefault: true },
      { id: 2, name: 'In Progress', color: '#2563eb', sortOrder: 2, isInitial: false, isCompleted: false, isDefault: true },
      { id: 3, name: 'Done', color: '#16a34a', sortOrder: 3, isInitial: false, isCompleted: true, isDefault: true }
    ];

    const allTasks = this.tasks();

    return statuses.map((col) => {
      const colNameLower = (col.name || '').trim().toLowerCase();
      const colSlugLower = (col.slug || '').trim().toLowerCase();

      const colTasks = allTasks.filter((t) => {
        // 1. Match by numeric statusId
        if (t.statusId != null && Number(t.statusId) === Number(col.id)) return true;

        const taskStatusLower = (t.status || t.statusName || '').trim().toLowerCase();
        
        // 2. Exact or case-insensitive name match
        if (taskStatusLower && (taskStatusLower === colNameLower || taskStatusLower === colSlugLower)) return true;

        // 3. Normalized string match (e.g. "to-do" vs "to do")
        const normalizedTaskStatus = taskStatusLower.replace(/[-_]/g, ' ');
        const normalizedColName = colNameLower.replace(/[-_]/g, ' ');
        if (normalizedTaskStatus && normalizedTaskStatus === normalizedColName) return true;

        // 4. If column is completed and task is marked completed or status matches completed aliases
        if (col.isCompleted && (t.completed || taskStatusLower === 'completed' || taskStatusLower === 'done')) return true;

        // 5. If column is initial and task is pending / open / not completed
        if (col.isInitial && !t.completed && (taskStatusLower === 'pending' || taskStatusLower === 'open' || taskStatusLower === 'to do' || taskStatusLower === 'todo' || !taskStatusLower)) return true;

        return false;
      });

      return {
        id: col.id,
        title: col.name,
        slug: col.slug || col.name,
        color: col.color,
        tasks: colTasks
      };
    });
  });

  protected onTaskDropped(event: KanbanTaskDropEvent): void {
    const task = this.tasks().find((item) => item.id === event.taskId);
    if (!task) return;
    if (task.status === event.targetStatus || task.statusName === event.targetStatus) return;
    const targetStage = this.taskStore.taskStatuses().find((s) => s.name === event.targetStatus || s.slug === event.targetStatus);
    this.taskStatusChanged.emit({
      id: event.taskId,
      status: targetStage ? targetStage.name : event.targetStatus,
      statusId: targetStage ? targetStage.id : undefined
    } as any);
  }
}
