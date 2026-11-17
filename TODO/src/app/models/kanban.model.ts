import { Task, TaskStatus } from './task.model';

/** Event when a task is dropped onto a Kanban column. */
export interface KanbanTaskDropEvent {
  taskId: number;
  targetStatus: TaskStatus;
}

export function resolveKanbanColumnStatus(task: Task): TaskStatus {
  if (task.completed || task.status === 'completed') {
    return 'completed';
  }
  if (task.status === 'in-progress') {
    return 'in-progress';
  }
  return 'pending';
}
