import { Component, computed, inject, input, output, signal } from '@angular/core';
import { formatEstimatedMinutes, Task } from '../../models/task.model';
import { ActionMenuComponent, ActionMenuItem } from '../action-menu/action-menu';
import { setKanbanDragTaskId } from '../kanban/kanban-drag.util';
import { SubscriptionService } from '../../core/subscription/subscription.service';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [ActionMenuComponent],
  templateUrl: './kanban-card.html',
  styleUrl: './kanban-card.css'
})
export class KanbanCardComponent {
  private readonly subService = inject(SubscriptionService);
  readonly task = input.required<Task>();
  readonly currentUserId = input<number | null | undefined>(null);
  readonly currentUsername = input<string | null | undefined>(null);
  readonly isAdmin = input(false);

  readonly taskSelected = output<Task>();
  readonly taskEdited = output<Task>();
  readonly taskDeleted = output<number>();
  protected readonly dragging = signal(false);
  private suppressTitleClick = false;

  protected readonly canDragDropFeature = computed(() => this.subService.hasFeature('kanban.drag_drop'));

  protected readonly effortLabel = computed(() => formatEstimatedMinutes(this.task().estimatedMinutes));

  protected readonly cardActions: ActionMenuItem[] = [
    { id: 'view', label: 'View details' },
    { id: 'edit', label: 'Edit task' },
    { id: 'delete', label: 'Delete task', destructive: true }
  ];

  protected isOwner(): boolean {
    if (this.isAdmin()) return true;
    const uid = this.currentUserId();
    const uname = this.currentUsername();
    const t = this.task();

    // Check if user is the creator
    const isCreator = (uid != null && Number(t.userId) === Number(uid)) ||
                      (Boolean(uname) && Boolean(t.creatorUsername) && t.creatorUsername === uname);
    if (isCreator) return true;

    // Check if user is an assignee
    if (uid != null && Array.isArray(t.assigneeIds) && t.assigneeIds.some((aid) => Number(aid) === Number(uid))) {
      return true;
    }
    if (Array.isArray(t.assignees)) {
      if (uid != null && t.assignees.some((u) => Number(u.id) === Number(uid))) {
        return true;
      }
      if (uname && t.assignees.some((u) => u.username === uname)) {
        return true;
      }
    }

    return false;
  }

  protected canDrag(): boolean {
    return this.isOwner() && this.canDragDropFeature();
  }

  protected onDragStart(event: DragEvent): void {
    if (!this.canDrag()) {
      event.preventDefault();
      if (!this.canDragDropFeature()) {
        this.subService.openModal('kanban.drag_drop');
      }
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest('app-action-menu')) {
      event.preventDefault();
      return;
    }
    const transfer = event.dataTransfer;
    if (!transfer) {
      return;
    }
    setKanbanDragTaskId(transfer, this.task().id);
    this.dragging.set(true);
  }

  protected onDragEnd(): void {
    this.dragging.set(false);
    this.suppressTitleClick = true;
    setTimeout(() => {
      this.suppressTitleClick = false;
    }, 200);
  }

  protected onTitleClick(event: MouseEvent): void {
    if (this.suppressTitleClick) {
      event.preventDefault();
      return;
    }
    this.taskSelected.emit(this.task());
  }

  protected selectCardAction(action: string): void {
    const t = this.task();
    if (action === 'view') {
      this.taskSelected.emit(t);
      return;
    }
    if (action === 'edit' && this.isOwner()) {
      this.taskEdited.emit(t);
      return;
    }
    if (action === 'delete' && this.isOwner()) {
      this.taskDeleted.emit(t.id);
      return;
    }
  }
}
