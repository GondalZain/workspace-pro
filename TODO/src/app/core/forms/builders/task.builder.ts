import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { NewTask, Task, TaskAttachment, TaskPriority, TaskStatus } from '../../../models/task.model';
import { appValidators } from '../validators';

export interface TaskEditorFormValue {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  estimatedHours: number;
  estimatedMinutesPart: number;
  priority: TaskPriority;
  status: TaskStatus;
  category: string;
  tags: string;
  projectId: number | null;
  assigneeIds: number[];
  formTemplateId: number | null;
}

export interface QuickTaskFormValue {
  title: string;
}

export interface TaskNoteFormValue {
  content: string;
}

export function createTaskEditorForm(fb: NonNullableFormBuilder) {
  return fb.group({
    title: fb.control('', { validators: [appValidators.requiredTrim] }),
    description: fb.control(''),
    dueDate: fb.control(''),
    dueTime: fb.control(''),
    estimatedHours: fb.control(0, { validators: [Validators.min(0), Validators.max(999)] }),
    estimatedMinutesPart: fb.control(0, { validators: [Validators.min(0), Validators.max(59)] }),
    priority: fb.control<TaskPriority>('medium'),
    status: fb.control<TaskStatus>('pending'),
    category: fb.control('Personal'),
    tags: fb.control(''),
    projectId: fb.control<number | null>(null, { validators: [appValidators.requiredSelect] }),
    assigneeIds: fb.control<number[]>([]),
    formTemplateId: fb.control<number | null>(null),
  });
}

export function createQuickTaskForm(fb: NonNullableFormBuilder) {
  return fb.group({
    title: fb.control('', { validators: [appValidators.requiredTrim] }),
  });
}

export function createTaskNoteForm(fb: NonNullableFormBuilder) {
  return fb.group({
    content: fb.control('', { validators: [appValidators.requiredTrim] }),
  });
}

export interface PatchTaskEditorOptions {
  /** When creating a task (no existing `task`), pre-select project from navigation context. */
  defaultProjectId?: number | null;
}

export function patchTaskEditorForm(
  form: ReturnType<typeof createTaskEditorForm>,
  task: Task | null,
  options?: PatchTaskEditorOptions
): void {
  form.patchValue(
    {
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: task?.dueDate ?? '',
      dueTime: task?.dueTime ?? '',
      estimatedHours: task?.estimatedMinutes != null ? Math.floor(task.estimatedMinutes / 60) : 0,
      estimatedMinutesPart: task?.estimatedMinutes != null ? task.estimatedMinutes % 60 : 0,
      priority: task?.priority ?? 'medium',
      status: task?.status ?? 'pending',
      category: task?.category ?? 'Personal',
      tags: task?.tags.join(', ') ?? '',
      projectId: task?.projectId ?? options?.defaultProjectId ?? null,
      assigneeIds: task?.assigneeIds ?? [],
      formTemplateId: task?.formTemplateId ?? null,
    },
    { emitEvent: false }
  );
}

export function quickTaskFormValueFromRaw(raw: QuickTaskFormValue): QuickTaskFormValue {
  return { title: raw.title.trim() };
}

export function taskNoteFormValueFromRaw(raw: TaskNoteFormValue): TaskNoteFormValue {
  return { content: raw.content.trim() };
}

function estimatedMinutesFromForm(hours: number, minutesPart: number): number | null {
  const h = Number(hours) || 0;
  const m = Number(minutesPart) || 0;
  const total = h * 60 + m;
  return total > 0 ? total : null;
}

export function taskEditorFormToNewTask(value: TaskEditorFormValue, attachments: TaskAttachment[]): NewTask {
  const status = value.status;
  return {
    title: value.title.trim(),
    description: value.description.trim(),
    dueDate: value.dueDate,
    dueTime: value.dueTime,
    estimatedMinutes: estimatedMinutesFromForm(value.estimatedHours, value.estimatedMinutesPart),
    priority: value.priority,
    status,
    completed: status === 'completed',
    category: value.category.trim() || 'Personal',
    tags: value.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    attachments,
    projectId: value.projectId,
    assigneeIds: value.assigneeIds,
    formTemplateId: value.formTemplateId,
  };
}
