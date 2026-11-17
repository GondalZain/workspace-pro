import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';
import { API_ROUTES } from './api.routes';
import {
  CreateTaskFormTemplatePayload,
  TaskFormTemplate,
  UpdateTaskFormTemplatePayload
} from '../../models/task-form-template.model';

@Injectable({ providedIn: 'root' })
export class FormTemplatesApiService {
  private readonly http = inject(HttpClient);
  private readonly refreshSubject = new Subject<void>();

  readonly refresh$ = this.refreshSubject.asObservable();

  list(): Observable<TaskFormTemplate[]> {
    return this.http.get<TaskFormTemplate[]>(`${API_BASE_URL}${API_ROUTES.formTemplates.list}`);
  }

  getDefault(): Observable<TaskFormTemplate | null> {
    return this.http.get<TaskFormTemplate | null>(`${API_BASE_URL}${API_ROUTES.formTemplates.default}`);
  }

  getById(id: number): Observable<TaskFormTemplate> {
    return this.http.get<TaskFormTemplate>(`${API_BASE_URL}${API_ROUTES.formTemplates.byId(id)}`);
  }

  create(payload: CreateTaskFormTemplatePayload): Observable<TaskFormTemplate> {
    return this.http.post<TaskFormTemplate>(`${API_BASE_URL}${API_ROUTES.formTemplates.list}`, payload).pipe(
      tap(() => this.refreshSubject.next())
    );
  }

  update(id: number, payload: UpdateTaskFormTemplatePayload): Observable<TaskFormTemplate> {
    return this.http.put<TaskFormTemplate>(`${API_BASE_URL}${API_ROUTES.formTemplates.byId(id)}`, payload).pipe(
      tap(() => this.refreshSubject.next())
    );
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${API_BASE_URL}${API_ROUTES.formTemplates.byId(id)}`).pipe(
      tap(() => this.refreshSubject.next())
    );
  }

  assignProjects(templateId: number | null, projectIds: number[]): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${API_BASE_URL}${API_ROUTES.formTemplates.list}/assign-projects`, {
      templateId,
      projectIds
    }).pipe(
      tap(() => this.refreshSubject.next())
    );
  }

  assignTasks(templateId: number | null, taskIds: number[]): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${API_BASE_URL}${API_ROUTES.formTemplates.list}/assign-tasks`, {
      templateId,
      taskIds
    }).pipe(
      tap(() => this.refreshSubject.next())
    );
  }

  triggerRefresh(): void {
    this.refreshSubject.next();
  }
}

