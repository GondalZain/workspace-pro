import { Component, input, output } from '@angular/core';
import { Task, TaskStatus } from '../../../models/task.model';
import { CalendarComponent } from '../calendar';

type ScheduleUser = {
  id?: number | null;
  username?: string | null;
  permissions?: string[];
} | null | undefined;

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CalendarComponent],
  templateUrl: './calendar-view.html',
  styleUrl: './calendar-view.css'
})
export class CalendarViewComponent {
  readonly tasks = input<Task[]>([]);
  readonly currentUser = input<ScheduleUser>(null);
  readonly isAdmin = input(false);

  readonly taskToggled = output<number>();
  readonly taskDeleted = output<number>();
  readonly taskEdited = output<Task>();
  readonly taskSelected = output<Task>();
  readonly taskStatusChanged = output<{ id: number; status: TaskStatus }>();
}
