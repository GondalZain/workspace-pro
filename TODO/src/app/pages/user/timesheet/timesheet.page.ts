import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import { TimesheetFormComponent, TimesheetTableComponent } from '../../../components/timesheet';
import { TimesheetStoreService } from '../../../services/timesheet-store.service';
import { SubscriptionService } from '../../../core/subscription/subscription.service';
import { NewTimesheetEntry, TimesheetEntry } from '../../../models/timesheet.model';

@Component({
  selector: 'app-user-timesheet-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WorkspaceUserLayoutComponent,
    TimesheetFormComponent,
    TimesheetTableComponent
  ],
  templateUrl: './timesheet.page.html',
  styleUrl: './timesheet.page.css'
})
export class UserTimesheetPage {
  private readonly timesheetStore = inject(TimesheetStoreService);
  private readonly subService = inject(SubscriptionService);

  readonly canLogTime = computed(() => this.subService.hasFeature('timesheet.logging'));
  readonly entries = this.timesheetStore.entries;

  openUpgradeModal(): void {
    this.subService.openModal('timesheet.logging');
  }

  constructor() {
    this.timesheetStore.refresh();
  }

  onAddEntry(entry: NewTimesheetEntry): void {
    this.timesheetStore.addEntry(entry);
  }

  onUpdateEntry(event: { id: number; changes: Partial<TimesheetEntry> }): void {
    this.timesheetStore.updateEntry(event.id, event.changes);
  }

  onDeleteEntry(id: number): void {
    this.timesheetStore.deleteEntry(id);
  }
}
