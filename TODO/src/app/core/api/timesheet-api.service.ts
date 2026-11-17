import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { NewTimesheetEntry, TimesheetEntry } from '../../models/timesheet.model';

@Injectable({ providedIn: 'root' })
export class TimesheetApiService {
  private readonly http = inject(HttpClient);
  private readonly timesheetsUrl = `${API_BASE_URL}/timesheets`;

  list() {
    return this.http.get<TimesheetEntry[]>(this.timesheetsUrl);
  }

  create(entry: NewTimesheetEntry) {
    return this.http.post<TimesheetEntry>(this.timesheetsUrl, entry);
  }

  update(id: number, changes: Partial<TimesheetEntry>) {
    return this.http.put<TimesheetEntry>(`${this.timesheetsUrl}/${id}`, changes);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.timesheetsUrl}/${id}`);
  }
}
