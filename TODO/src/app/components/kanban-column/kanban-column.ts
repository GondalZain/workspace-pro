import { Component, input, output, signal } from '@angular/core';
import { KanbanTaskDropEvent } from '../../models/kanban.model';
import { Task, TaskStatus } from '../../models/task.model';
import { KanbanCardComponent } from '../kanban-card/kanban-card';
import { isKanbanTaskDragEvent, readKanbanDragTaskId } from '../kanban/kanban-drag.util';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [KanbanCardComponent],
  templateUrl: './kanban-column.html',
  styleUrl: './kanban-column.css'
})
export class KanbanColumnComponent {
  readonly title = input.required<string>();
  readonly status = input.required<TaskStatus>();
  readonly color = input<string>('#64748b');
  readonly tasks = input.required<Task[]>();
  readonly currentUserId = input<number | null | undefined>(null);
  readonly currentUsername = input<string | null | undefined>(null);
  readonly isAdmin = input(false);

  readonly taskSelected = output<Task>();
  readonly taskEdited = output<Task>();
  readonly taskDeleted = output<number>();
  readonly quickAddClicked = output<TaskStatus>();
  readonly taskDropped = output<KanbanTaskDropEvent>();

  protected readonly isDropTarget = signal(false);

  protected onDragLeave(event: DragEvent): void {
    const column = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as Node | null;
    if (related && column.contains(related)) {
      return;
    }
    this.isDropTarget.set(false);
  }

  protected onDragOver(event: DragEvent): void {
    if (!isKanbanTaskDragEvent(event)) {
      return;
    }
    event.preventDefault();
    this.isDropTarget.set(true);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDropTarget.set(false);
    const transfer = event.dataTransfer;
    if (!transfer) {
      return;
    }
    const taskId = readKanbanDragTaskId(transfer);
    if (taskId == null) {
      return;
    }
    if (this.tasks().some((task) => task.id === taskId)) {
      return;
    }
    this.taskDropped.emit({ taskId, targetStatus: this.status() });
  }
}
