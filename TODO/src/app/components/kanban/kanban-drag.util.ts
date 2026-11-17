/** Payload type for HTML5 drag-and-drop between Kanban columns. */
export const KANBAN_TASK_DRAG_MIME = 'application/x-kanban-task-id';

export function setKanbanDragTaskId(transfer: DataTransfer, taskId: number): void {
  transfer.clearData();
  transfer.setData(KANBAN_TASK_DRAG_MIME, String(taskId));
  transfer.setData('text/plain', String(taskId));
  transfer.effectAllowed = 'move';
}

export function readKanbanDragTaskId(transfer: DataTransfer): number | null {
  let raw = transfer.getData(KANBAN_TASK_DRAG_MIME);
  if (!raw) {
    raw = transfer.getData('text/plain');
  }
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function isKanbanTaskDragEvent(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  if (!types) {
    return false;
  }
  return Array.from(types).includes(KANBAN_TASK_DRAG_MIME);
}
