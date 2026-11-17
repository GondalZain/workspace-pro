import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  formatEstimatedMinutes,
  formatSpentMinutes,
  isTaskOverdue,
  isTaskOwner,
  parseTimeToMinutes,
  Task,
  TaskFilter,
  TaskPriority,
  TaskStatus
} from '../../models/task.model';
import { ActionMenuComponent, ActionMenuItem } from '../action-menu/action-menu';
import { TimesheetStoreService } from '../../services/timesheet-store.service';
import { TaskStoreService } from '../../services/task-store.service';
import { AdminApiService } from '../../core/api/admin-api.service';
import { AuthService, User } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/api/api.config';

export interface DisplayUser {
  id?: number;
  name: string;
  avatarUrl: string | null;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, ActionMenuComponent],
  templateUrl: './task-list.html',
  styleUrl: './task-list.css'
})
export class TaskListComponent {
  private readonly timesheetStore = inject(TimesheetStoreService);
  private readonly taskStore = inject(TaskStoreService);
  private readonly adminApi = inject(AdminApiService);
  private readonly authService = inject(AuthService);

  readonly tasks = input.required<Task[]>();
  readonly allTasksCount = input.required<number>();
  readonly selectedFilter = input.required<TaskFilter>();
  readonly currentUserId = input<number | null | undefined>(null);
  readonly currentUsername = input<string | null | undefined>(null);
  readonly isAdmin = input(false);
  /** List page uses compact rows; other views can use grid cards. */
  readonly layout = input<'grid' | 'list' | 'table'>('grid');
  /** Narrow panels (e.g. project detail) use tighter columns and hide descriptions. */
  readonly tableVariant = input<'full' | 'compact'>('full');

  protected readonly allUsers = signal<User[]>([]);
  private readonly uploadBaseUrl = API_BASE_URL.replace(/\/api$/, '');

  private readonly userByIdMap = computed(() => {
    const map = new Map<number, User>();
    for (const u of this.allUsers()) {
      map.set(u.id, u);
    }
    return map;
  });

  private readonly userByNameMap = computed(() => {
    const map = new Map<string, User>();
    for (const u of this.allUsers()) {
      map.set(u.username.toLowerCase(), u);
    }
    return map;
  });

  constructor() {
    this.adminApi.listUsers().subscribe({
      next: (users) => this.allUsers.set(users),
      error: () => this.allUsers.set([])
    });
  }

  protected profileImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/')) return `${this.uploadBaseUrl}${path}`;
    return `${this.uploadBaseUrl}/${path}`;
  }

  protected getCreator(task: Task): DisplayUser {
    if (task.userId) {
      const u = this.userByIdMap().get(Number(task.userId));
      if (u) {
        return {
          id: u.id,
          name: u.username,
          avatarUrl: this.profileImageUrl(u.profileImagePath)
        };
      }
    }
    if (task.creatorUsername) {
      const u = this.userByNameMap().get(task.creatorUsername.toLowerCase());
      if (u) {
        return {
          id: u.id,
          name: u.username,
          avatarUrl: this.profileImageUrl(u.profileImagePath)
        };
      }
      return { name: task.creatorUsername, avatarUrl: null };
    }
    const curr = this.authService.getUser();
    if (curr && (task.userId === curr.id || !task.userId)) {
      return {
        id: curr.id,
        name: curr.username,
        avatarUrl: this.profileImageUrl(curr.profileImagePath)
      };
    }
    return { name: 'Unknown', avatarUrl: null };
  }

  protected getAssignees(task: Task): DisplayUser[] {
    if (!task.assigneeIds || task.assigneeIds.length === 0) return [];
    const result: DisplayUser[] = [];
    for (const id of task.assigneeIds) {
      const u = this.userByIdMap().get(Number(id));
      if (u) {
        result.push({
          id: u.id,
          name: u.username,
          avatarUrl: this.profileImageUrl(u.profileImagePath)
        });
      } else {
        result.push({
          id: Number(id),
          name: `User #${id}`,
          avatarUrl: null
        });
      }
    }
    return result;
  }

  protected getStatusItem(task: Task) {
    const statuses = this.taskStore.taskStatuses();
    if (task.statusId != null) {
      const byId = statuses.find((s) => s.id === task.statusId);
      if (byId) return byId;
    }
    const val = task.status || (task.completed ? 'completed' : 'pending');
    return statuses.find((s) => s.name === val || s.slug === val);
  }

  protected statusLabel(task: Task): string {
    const matched = this.getStatusItem(task);
    if (matched) return matched.name;
    if (task.statusName) return task.statusName;
    if (task.status) return task.status;
    if (task.completed || task.status === 'completed') return 'Completed';
    return 'To do';
  }

  protected statusLabelCompact(task: Task): string {
    const matched = this.getStatusItem(task);
    if (matched) return matched.name;
    if (task.completed || task.status === 'completed') return 'Done';
    if (task.status === 'in-progress') return 'Active';
    return 'To do';
  }

  protected statusColor(task: Task): string {
    const matched = this.getStatusItem(task);
    if (matched?.color) return matched.color;
    if (task.completed || task.status === 'completed') return '#16a34a';
    if (task.status === 'in-progress') return '#2563eb';
    return '#dc2626';
  }
  readonly taskToggled = output<number>();
  readonly taskDeleted = output<number>();
  readonly taskEdited = output<Task>();
  readonly taskSelected = output<Task>();
  readonly taskStatusChanged = output<{ id: number; status: TaskStatus }>();

  protected readonly ownerTaskActions: ActionMenuItem[] = [
    { id: 'view', label: 'View details' },
    { id: 'delete', label: 'Delete task', destructive: true }
  ];

  protected readonly viewerTaskActions: ActionMenuItem[] = [
    { id: 'view', label: 'View details' }
  ];

  protected isOwner(task: Task): boolean {
    if (this.isAdmin()) return true;
    return isTaskOwner(task, this.currentUserId(), this.currentUsername());
  }

  protected isOverdue(task: Task): boolean {
    return isTaskOverdue(task);
  }

  protected timeRequiredLabel(task: Task): string {
    return formatEstimatedMinutes(task.estimatedMinutes) || '—';
  }

  protected getSpentMinutes(task: Task): number {
    let minutes = task.spentMinutes || 0;
    const entries = this.timesheetStore.entries();
    if (entries.length > 0 && task.title) {
      const taskTitleClean = task.title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!taskTitleClean) return minutes;

      for (const entry of entries) {
        if (!entry.task) continue;
        const rawEntryTask = entry.task.trim().toLowerCase();
        if (!rawEntryTask || rawEntryTask === '-' || rawEntryTask === 'none' || rawEntryTask === 'no task') {
          continue;
        }
        const entryTaskClean = rawEntryTask.replace(/[^a-z0-9]/g, '');
        if (!entryTaskClean) continue;

        if (
          entryTaskClean === taskTitleClean ||
          (entryTaskClean.length >= 8 && taskTitleClean.startsWith(entryTaskClean)) ||
          (taskTitleClean.length >= 8 && entryTaskClean.startsWith(taskTitleClean))
        ) {
          minutes += parseTimeToMinutes(entry.time);
        }
      }
    }
    return minutes;
  }

  protected getSpentLabel(task: Task): string {
    const mins = this.getSpentMinutes(task);
    if (mins <= 0) return '0m';
    return formatSpentMinutes(mins);
  }

  protected formatDue(task: Task): string {
    if (task.dueDate && task.dueTime) {
      return `${task.dueDate} · ${task.dueTime}`;
    }
    if (task.dueDate) {
      return task.dueDate;
    }
    if (task.dueTime) {
      return task.dueTime;
    }
    return '—';
  }

  protected getTaskDisplayDescription(task: Task): string {
    if (task.description && task.description.trim()) {
      return task.description;
    }
    if (task.customFields && typeof task.customFields === 'object') {
      const descVal = task.customFields['description'] || task.customFields['details'] || task.customFields['notes'];
      if (typeof descVal === 'string' && descVal.trim()) {
        return descVal;
      }
    }
    return '';
  }

  protected priorityShort(priority: TaskPriority): string {
    if (priority === 'high') return 'H';
    if (priority === 'low') return 'L';
    return 'M';
  }

  protected onDirectStatusChange(task: Task, newStatus: string, event: Event): void {
    event.stopPropagation();
    if (!this.isOwner(task)) return;
    this.taskStatusChanged.emit({ id: task.id, status: newStatus as TaskStatus });
  }

  protected cycleStatus(task: Task, event: Event): void {
    event.stopPropagation();
    if (!this.isOwner(task)) return;
    const nextStatus: Record<TaskStatus, TaskStatus> = {
      'pending': 'in-progress',
      'in-progress': 'completed',
      'completed': 'pending'
    };
    const current = task.status || (task.completed ? 'completed' : 'pending');
    const newStatus = nextStatus[current] || 'pending';
    this.taskStatusChanged.emit({ id: task.id, status: newStatus });
  }

  protected selectTaskAction(task: Task, action: string): void {
    if (action === 'view') {
      this.taskSelected.emit(task);
      return;
    }
    if (!this.isOwner(task)) return;
    if (action === 'edit') this.taskEdited.emit(task);
    if (action === 'toggle') this.taskToggled.emit(task.id);
    if (action === 'delete') this.taskDeleted.emit(task.id);
    if (action.startsWith('status:')) {
      const status = action.replace('status:', '') as TaskStatus;
      this.taskStatusChanged.emit({ id: task.id, status });
    }
  }
}
