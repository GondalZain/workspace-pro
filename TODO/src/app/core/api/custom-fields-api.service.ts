import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import {
  CustomFieldDefinition,
  CustomFieldEntityType,
  CreateCustomFieldDto,
  UpdateCustomFieldDto
} from '../../models/custom-field.model';

@Injectable({
  providedIn: 'root'
})
export class CustomFieldsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/custom-fields`;

  private readonly refreshTrigger$ = new Subject<void>();
  readonly refresh$ = this.refreshTrigger$.asObservable();

  notifyChanged(): void {
    this.refreshTrigger$.next();
  }

  getFields(entityType?: CustomFieldEntityType, includeInactive = false): Observable<CustomFieldDefinition[]> {
    const params: string[] = [];
    if (entityType) params.push(`entityType=${entityType}`);
    if (includeInactive) params.push(`includeInactive=true`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return this.http.get<CustomFieldDefinition[]>(`${this.baseUrl}${query}`, { withCredentials: true });
  }

  createField(dto: CreateCustomFieldDto): Observable<CustomFieldDefinition> {
    return this.http
      .post<CustomFieldDefinition>(this.baseUrl, dto, { withCredentials: true })
      .pipe(tap(() => this.notifyChanged()));
  }

  updateField(id: number, dto: UpdateCustomFieldDto): Observable<CustomFieldDefinition> {
    return this.http
      .put<CustomFieldDefinition>(`${this.baseUrl}/${id}`, dto, { withCredentials: true })
      .pipe(tap(() => this.notifyChanged()));
  }

  deleteField(id: number): Observable<{ success: boolean; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`, { withCredentials: true })
      .pipe(tap(() => this.notifyChanged()));
  }

  restoreField(id: number): Observable<{ success: boolean; message: string }> {
    return this.http
      .post<{ success: boolean; message: string }>(`${this.baseUrl}/${id}/restore`, {}, { withCredentials: true })
      .pipe(tap(() => this.notifyChanged()));
  }

  reorderFields(entityType: CustomFieldEntityType, orderedIds: number[]): Observable<CustomFieldDefinition[]> {
    return this.http
      .post<CustomFieldDefinition[]>(`${this.baseUrl}/reorder`, { entityType, orderedIds }, { withCredentials: true })
      .pipe(tap(() => this.notifyChanged()));
  }
}


