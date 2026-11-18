import { Injectable, computed, inject, signal } from '@angular/core';
import { isOpenTask, isTaskOwner, NewTask, Task } from '../models/task.model';
import { TaskApiService } from '../core/api/task-api.service';
import { AuthService } from '../core/auth/auth.service';
import { NotificationService } from '../core/notifications/notification.service';

@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  private readonly api = inject(TaskApiService);
  private readonly auth = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  readonly tasks = signal<Task[]>([]);
  readonly taskStatuses = signal<import('../models/task.model').TaskStatusItem[]>([]);


  /** To Do + In Progress for the logged-in user (excludes completed) — nav badge. */
  readonly navActiveTaskCount = computed(() => {
    const user = this.auth.getUser();
    const userId = user?.id;
    const username = user?.username;
    return this.tasks().filter(
      (task) => isTaskOwner(task, userId, username) && isOpenTask(task)
    ).length;
  });
  private readonly storedTaskIdKey = 'todo_active_task_id';
  readonly activeTaskId = signal<number | null>(this.getInitialActiveTaskId());
  private readonly storedOriginKey = 'todo_edit_origin';
  readonly editOrigin = signal<'dashboard' | 'detail' | 'kanban' | 'calendar' | 'project'>(this.getInitialEditOrigin());
  private readonly storedReturnOriginKey = 'todo_task_return_origin';
  readonly taskReturnOrigin = signal<'dashboard' | 'detail' | 'kanban' | 'calendar' | 'project'>(this.getInitialTaskReturnOrigin());
  private readonly storedReturnProjectIdKey = 'todo_task_return_project_id';
  readonly taskReturnProjectId = signal<number | null>(this.getInitialTaskReturnProjectId());
  private readonly storedReturnIsAdminKey = 'todo_task_return_is_admin';
  readonly taskReturnIsAdmin = signal<boolean>(this.getInitialTaskReturnIsAdmin());

  setActiveTaskId(id: number | null): void {
    this.activeTaskId.set(id);
    if (id !== null) {
      sessionStorage.setItem(this.storedTaskIdKey, String(id));
    } else {
      sessionStorage.removeItem(this.storedTaskIdKey);
    }
  }

  setEditOrigin(origin: 'dashboard' | 'detail' | 'kanban' | 'calendar' | 'project'): void {
    this.editOrigin.set(origin);
    sessionStorage.setItem(this.storedOriginKey, origin);
  }

  setTaskReturnContext(
    origin: 'dashboard' | 'detail' | 'kanban' | 'calendar' | 'project',
    projectId: number | null = null,
    isAdmin: boolean = false
  ): void {
    this.taskReturnOrigin.set(origin);
    sessionStorage.setItem(this.storedReturnOriginKey, origin);

    this.taskReturnIsAdmin.set(isAdmin);
    if (isAdmin) {
      sessionStorage.setItem(this.storedReturnIsAdminKey, 'true');
    } else {
      sessionStorage.removeItem(this.storedReturnIsAdminKey);
    }

    if (origin === 'project' && projectId !== null) {
      this.taskReturnProjectId.set(projectId);
      sessionStorage.setItem(this.storedReturnProjectIdKey, String(projectId));
    } else {
      this.taskReturnProjectId.set(null);
      sessionStorage.removeItem(this.storedReturnProjectIdKey);
    }
  }

  private getInitialTaskReturnIsAdmin(): boolean {
    return sessionStorage.getItem('todo_task_return_is_admin') === 'true';
  }

  private getInitialActiveTaskId(): number | null {
    const stored = sessionStorage.getItem('todo_active_task_id');
    return stored ? Number(stored) : null;
  }

  private getInitialEditOrigin(): 'dashboard' | 'detail' | 'kanban' | 'calendar' | 'project' {
    const stored = sessionStorage.getItem('todo_edit_origin');
    if (stored === 'detail' || stored === 'kanban' || stored === 'calendar' || stored === 'project') {
      return stored;
    }
    return 'dashboard';
  }

  private getInitialTaskReturnOrigin(): 'dashboard' | 'detail' | 'kanban' | 'calendar' | 'project' {
    const stored = sessionStorage.getItem('todo_task_return_origin');
    if (stored === 'detail' || stored === 'kanban' || stored === 'calendar' || stored === 'project') {
      return stored;
    }
    return 'dashboard';
  }

  private getInitialTaskReturnProjectId(): number | null {
    const stored = sessionStorage.getItem('todo_task_return_project_id');
    return stored ? Number(stored) : null;
  }

  constructor() {
    this.refreshStatuses();

    // Automatically update user UI whenever admin or super-admin updates company statuses
    this.notificationService.statusesUpdated$.subscribe((payload) => {
      if (payload?.statuses && Array.isArray(payload.statuses)) {
        this.taskStatuses.set(payload.statuses);
      } else {
        this.refreshStatuses();
      }
      // Re-fetch tasks so any updated task status columns re-render instantly without user needing to refresh
      this.api.list().subscribe({
        next: (tasks) => this.tasks.set(tasks),
        error: (error) => console.error('Could not refresh tasks after status update.', error)
      });
    });
  }


  refreshStatuses(): void {
    this.api.getStatuses().subscribe({
      next: (statuses) => {
        if (Array.isArray(statuses)) {
          this.taskStatuses.set(statuses);
        }
      },
      error: (error) => console.error('Could not load task statuses from the backend.', error)
    });
  }

  refresh(): void {
    this.api.list().subscribe({
      next: (tasks) => this.tasks.set(tasks),
      error: (error) => console.error('Could not load tasks from the backend.', error)
    });
    this.refreshStatuses();
  }



  add(task: NewTask | string, onCreated?: (createdTask: Task) => void): void {
    const newTask = typeof task === 'string' ? this.createTask(task) : task;
    this.api.create(newTask).subscribe({
      next: (createdTask) => {
        this.tasks.update((tasks) => [createdTask, ...tasks.filter((t) => t.id !== createdTask.id)]);
        this.notificationService.refresh(true);
        onCreated?.(createdTask);
      },
      error: (error) => console.error('Could not add task.', error)
    });
  }

  update(id: number, changes: Partial<Task>): void {
    const current = this.tasks().find((item) => item.id === id);
    
    // Auto sync status, statusId, and completed boolean based on dynamic statuses
    if (changes.status || changes.statusId) {
      const match = this.taskStatuses().find((s) => 
        (changes.statusId && s.id === changes.statusId) ||
        (changes.status && (s.name === changes.status || s.slug === changes.status))
      );
      if (match) {
        changes.statusId = match.id;
        changes.status = match.name;
        changes.completed = Boolean(match.isCompleted);
      } else if (changes.status === 'completed' || changes.status === 'Done') {
        changes.completed = true;
      }
    } else if (changes.completed !== undefined) {
      if (changes.completed) {
        const doneStatus = this.taskStatuses().find((s) => Boolean(s.isCompleted));
        if (doneStatus) {
          changes.statusId = doneStatus.id;
          changes.status = doneStatus.name;
        } else {
          changes.status = 'Done';
        }
      } else if (current?.completed || current?.status === 'Done' || current?.status === 'completed') {
        const initialStatus = this.taskStatuses().find((s) => Boolean(s.isInitial)) || this.taskStatuses().find((s) => !s.isCompleted);
        if (initialStatus) {
          changes.statusId = initialStatus.id;
          changes.status = initialStatus.name;
        } else {
          changes.status = 'To Do';
        }
      }
    }


    const updatedMerged = current ? { ...current, ...changes } : ({ id, ...changes } as Task);

    this.tasks.update((tasks) =>
      tasks.map((item) => (item.id === id ? updatedMerged : item))
    );

    this.api.update(id, updatedMerged).subscribe({
      next: (updatedTask) => {
        this.tasks.update((tasks) =>
          tasks.map((item) => (item.id === id ? updatedTask : item))
        );
        this.notificationService.refresh(true);
      },
      error: (error) => {
        console.error('Could not update task.', error);
        this.refresh();
      }
    });
  }

  toggle(id: number): void {
    this.tasks.update((tasks) =>
      tasks.map((task) => {
        if (task.id !== id) return task;
        const nextCompleted = !task.completed;
        return {
          ...task,
          completed: nextCompleted,
          status: nextCompleted ? 'completed' : 'pending'
        };
      })
    );

    this.api.toggle(id).subscribe({
      next: (updatedTask) => {
        this.tasks.update((tasks) => tasks.map((task) => (task.id === id ? updatedTask : task)));
        this.notificationService.refresh(true);
      },
      error: (error) => {
        console.error('Could not toggle task.', error);
        this.refresh();
      }
    });
  }

  remove(id: number): void {
    this.api.remove(id).subscribe({
      next: () => this.tasks.update((tasks) => tasks.filter((task) => task.id !== id)),
      error: (error) => console.error('Could not delete task.', error)
    });
  }

  clearCompleted(): void {
    this.api.clearCompleted().subscribe({
      next: () => this.tasks.update((tasks) => tasks.filter((task) => !task.completed)),
      error: (error) => console.error('Could not clear completed tasks.', error)
    });
  }

  private createTask(title: string): NewTask {
    return { title, description: '', completed: false, status: 'pending', priority: 'medium', dueDate: '', dueTime: '', estimatedMinutes: null, category: 'Personal', tags: [], attachments: [], projectId: null };
  }

}
