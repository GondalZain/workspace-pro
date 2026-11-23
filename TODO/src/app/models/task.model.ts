export type TaskFilter = 'all' | 'active' | 'pending' | 'in-progress' | 'completed' | string;
export type TaskScope = 'all' | 'my';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | string;
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskStatusItem {
  id?: number;
  companyId?: number | null;
  name: string;
  slug?: string;
  oldSlug?: string;
  oldName?: string;
  color: string;
  sortOrder: number;
  isInitial?: boolean | number;
  isCompleted: boolean | number;
  isDefault: boolean | number;
  isActive?: boolean | number;
}


export interface UserSummary {
  id: number;
  username: string;
  email?: string;
  profileImagePath?: string | null;
  role?: string | null;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface TaskDependencyRef {
  id: number;
  taskId: number;
  title: string;
  status?: string;
  completed?: boolean;
  priority?: string;
}

export interface TaskDependenciesInfo {
  blockedBy: TaskDependencyRef[];
  blocking: TaskDependencyRef[];
}

export interface AiSrsTaskDraft {
  tempId: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  estimatedMinutes: number;
  dependsOnTempIds: string[];
  dueDate?: string;
  selected?: boolean;
}

export interface AiSrsModuleDraft {
  name: string;
  description?: string;
  tasks: AiSrsTaskDraft[];
}

export interface AiSrsAnalysisResult {
  projectTitle?: string;
  projectDescription?: string;
  summary: string;
  totalEstimatedMinutes: number;
  suggestedDeadline?: string;
  modules: AiSrsModuleDraft[];
}

export interface Task {
  id: number;
  userId?: number | null;
  projectId?: number | null;
  creatorUsername?: string | null;
  creator?: UserSummary | null;
  assigneeIds?: number[];
  assignees?: UserSummary[];
  title: string;
  description: string;
  completed: boolean;
  statusId?: number | null;
  status: TaskStatus;
  statusName?: string;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string;
  /** Expected effort to finish (minutes). Null = not set. */
  estimatedMinutes: number | null;
  /** Actual time spent on task (minutes). */
  spentMinutes?: number | null;
  category: string;
  tags: string[];
  attachments: TaskAttachment[];
  customFields?: Record<string, any>;
  formTemplateId?: number | null;
  dependencies?: TaskDependenciesInfo;
  createdAt: string;
}

export type NewTask = Omit<Task, 'id' | 'createdAt'>;

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2
};

export function isPendingTask(task: Task): boolean {
  if (task.completed || task.status === 'completed') {
    return false;
  }
  return task.status === 'pending' || !task.status;
}

/** To Do + In Progress (excludes completed). */
export function isOpenTask(task: Task): boolean {
  if (task.completed || task.status === 'completed') {
    return false;
  }
  return task.status === 'pending' || task.status === 'in-progress' || !task.status;
}

export function isTaskOwner(
  task: Task,
  userId?: number | null,
  username?: string | null
): boolean {
  if (userId != null && Number(task.userId) === Number(userId)) {
    return true;
  }
  if (Boolean(username) && Boolean(task.creatorUsername) && task.creatorUsername === username) {
    return true;
  }
  if (userId != null && Array.isArray(task.assigneeIds) && task.assigneeIds.includes(Number(userId))) {
    return true;
  }
  return false;
}

export function formatEstimatedMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0 || !Number.isFinite(minutes)) {
    return '';
  }
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const str = String(timeStr).trim().toLowerCase();
  if (!str) return 0;

  if (!isNaN(Number(str))) {
    return Math.max(0, Math.round(Number(str)));
  }

  let totalMinutes = 0;
  const hoursMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/);
  if (hoursMatch) {
    totalMinutes += Math.round(parseFloat(hoursMatch[1]) * 60);
  }

  const minsMatch = str.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/);
  if (minsMatch) {
    totalMinutes += parseInt(minsMatch[1], 10);
  }

  if (!hoursMatch && !minsMatch) {
    const colonMatch = str.match(/^(\d+):(\d{1,2})$/);
    if (colonMatch) {
      totalMinutes = parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
    }
  }

  return totalMinutes;
}

export function formatSpentMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0 || !Number.isFinite(minutes)) {
    return '0m';
  }
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function isTaskOverdue(task: Task, todayIsoStr?: string): boolean {
  if (!task.dueDate || task.completed || task.status === 'completed') {
    return false;
  }
  const today = todayIsoStr || new Date().toISOString().slice(0, 10);
  return task.dueDate < today;
}


