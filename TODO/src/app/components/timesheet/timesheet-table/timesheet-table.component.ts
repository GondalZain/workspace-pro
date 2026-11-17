import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetEntry } from '../../../models/timesheet.model';

@Component({
  selector: 'app-timesheet-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timesheet-table.component.html',
  styleUrl: './timesheet-table.component.css'
})
export class TimesheetTableComponent {
  @Input() entries: TimesheetEntry[] = [];
  @Input() hideTaskAndProject = false;
  @Input() readonly = false;
  @Output() entryDeleted = new EventEmitter<number>();
  @Output() entryUpdated = new EventEmitter<{ id: number; changes: Partial<TimesheetEntry> }>();

  editingId = signal<number | null>(null);
  editBuffer: Partial<TimesheetEntry> = {};

  startEdit(entry: TimesheetEntry): void {
    this.editingId.set(entry.id);
    this.editBuffer = { ...entry };
  }

  saveEdit(id: number): void {
    this.entryUpdated.emit({ id, changes: this.editBuffer });
    this.editingId.set(null);
    this.editBuffer = {};
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editBuffer = {};
  }

  deleteEntry(id: number): void {
    if (confirm('Are you sure you want to remove this timesheet entry?')) {
      this.entryDeleted.emit(id);
    }
  }
}
