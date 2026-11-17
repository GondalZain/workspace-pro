import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { NewTask, Task } from '../../models/task.model';
import { TaskNote } from '../../models/task-note.model';
import { API_BASE_URL } from './api.config';
import { API_ROUTES } from './api.routes';

@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);
  private readonly tasksUrl = `${API_BASE_URL}${API_ROUTES.tasks.list}`;

  list() {
    return this.http.get<Task[]>(this.tasksUrl);
  }

  getStatuses() {
    return this.http.get<import('../../models/task.model').TaskStatusItem[]>(`${API_BASE_URL}${API_ROUTES.tasks.statuses}`);
  }

  updateStatuses(statuses: import('../../models/task.model').TaskStatusItem[]) {
    return this.http.put<import('../../models/task.model').TaskStatusItem[]>(`${API_BASE_URL}${API_ROUTES.tasks.statuses}`, statuses);
  }

  checkStatusUsage(identifier: string | number) {
    const isNum = typeof identifier === 'number' || /^\d+$/.test(String(identifier));
    const params: Record<string, string> = isNum
      ? { statusId: String(identifier), id: String(identifier) }
      : { name: String(identifier) };
    return this.http.get<{ identifier?: string; slug?: string; taskCount: number; canDelete: boolean }>(
      `${API_BASE_URL}${API_ROUTES.tasks.statuses}/usage`,
      { params }
    );
  }


  getStatusTemplates() {
    return this.http.get<any[]>(`${API_BASE_URL}${API_ROUTES.tasks.statusTemplates}`);
  }

  saveStatusTemplate(name: string, description: string, statuses: import('../../models/task.model').TaskStatusItem[]) {
    return this.http.post<any>(`${API_BASE_URL}${API_ROUTES.tasks.statusTemplates}`, { name, description, statuses });
  }

  deleteStatusTemplate(id: number) {
    return this.http.delete<void>(`${API_BASE_URL}${API_ROUTES.tasks.statusTemplateById(id)}`);
  }




  getNotes(taskId: number) {
    return this.http.get<TaskNote[]>(`${API_BASE_URL}${API_ROUTES.notes.byTask(taskId)}`);
  }

  addNote(taskId: number, content: string) {
    return this.http.post<TaskNote>(`${API_BASE_URL}${API_ROUTES.notes.byTask(taskId)}`, { content });
  }

  create(task: NewTask | string) {
    return this.http.post<Task>(this.tasksUrl, typeof task === 'string' ? this.quickTask(task) : task);
  }

  update(id: number, task: Task) {
    return this.http.put<Task>(`${API_BASE_URL}${API_ROUTES.tasks.byId(id)}`, task);
  }

  toggle(id: number) {
    return this.http.patch<Task>(`${API_BASE_URL}${API_ROUTES.tasks.toggle(id)}`, {});
  }

  remove(id: number) {
    return this.http.delete<void>(`${API_BASE_URL}${API_ROUTES.tasks.byId(id)}`);
  }

  clearCompleted() {
    return this.http.delete<{ deleted: number }>(`${API_BASE_URL}${API_ROUTES.tasks.completed}`);
  }

  private quickTask(title: string): NewTask {
    return { title, description: '', completed: false, status: 'pending', priority: 'medium', dueDate: '', dueTime: '', estimatedMinutes: null, category: 'Personal', tags: [], attachments: [], projectId: null };
  }
}
