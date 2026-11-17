import { Injectable, inject, signal, computed } from '@angular/core';
import { NewTimesheetEntry, TimesheetEntry } from '../models/timesheet.model';
import { TimesheetApiService } from '../core/api/timesheet-api.service';

@Injectable({ providedIn: 'root' })
export class TimesheetStoreService {
  private readonly api = inject(TimesheetApiService);

  readonly entries = signal<TimesheetEntry[]>([]);
  readonly totalEntries = computed(() => this.entries().length);
  readonly isLoading = signal<boolean>(false);

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.isLoading.set(true);
    this.api.list().subscribe({
      next: (items) => {
        this.entries.set(this.resequence(items));
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Could not load timesheet entries from database.', error);
        this.isLoading.set(false);
      }
    });
  }

  private resequence(items: TimesheetEntry[]): TimesheetEntry[] {
    return items.map((item, index) => ({
      ...item,
      seqNo: index + 1
    }));
  }

  addEntry(entry: NewTimesheetEntry, onCreated?: (entry: TimesheetEntry) => void): void {
    this.api.create(entry).subscribe({
      next: (created) => {
        this.entries.update((items) => this.resequence([...items, created]));
        onCreated?.(created);
      },
      error: (error) => console.error('Could not create timesheet entry.', error)
    });
  }

  updateEntry(id: number, changes: Partial<TimesheetEntry>): void {
    this.api.update(id, changes).subscribe({
      next: (updated) => {
        this.entries.update((items) =>
          this.resequence(items.map((item) => (item.id === id ? { ...item, ...updated } : item)))
        );
      },
      error: (error) => console.error('Could not update timesheet entry.', error)
    });
  }

  deleteEntry(id: number): void {
    this.api.delete(id).subscribe({
      next: () => {
        this.entries.update((items) => this.resequence(items.filter((item) => item.id !== id)));
      },
      error: (error) => console.error('Could not delete timesheet entry.', error)
    });
  }
}
