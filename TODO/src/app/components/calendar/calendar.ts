import { Component, computed, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionMenuComponent, ActionMenuItem } from '../action-menu/action-menu';
import { Task, TaskStatus, isTaskOwner } from '../../models/task.model';
import { TaskListComponent } from '../task-list/task-list';

type CurrentUser = {
  id?: number | null;
  username?: string | null;
  permissions?: string[];
} | null | undefined;

export type CalendarVariant = 'schedule' | 'picker';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, ActionMenuComponent, TaskListComponent],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css'
})
export class CalendarComponent {
  /** `picker` = month only (task list). `schedule` = month + day agenda (calendar page). */
  readonly variant = input<CalendarVariant>('schedule');

  readonly tasks = input<Task[]>([]);
  readonly currentUser = input<CurrentUser>(null);
  readonly isAdmin = input(false);

  /** Two-way month navigation — bind from parent or use defaults in-template. */
  readonly calendarYear = model(new Date().getFullYear());
  readonly calendarMonthIndex = model(new Date().getMonth());
  readonly selectedDay = model<number | null>(null);

  readonly taskToggled = output<number>();
  readonly taskDeleted = output<number>();
  readonly taskEdited = output<Task>();
  readonly taskSelected = output<Task>();
  readonly taskStatusChanged = output<{ id: number; status: TaskStatus }>();

  protected readonly currentUserId = computed(() => this.currentUser()?.id);
  protected readonly currentUsername = computed(() => this.currentUser()?.username);

  protected readonly calendarMonthLabel = computed(() => {
    const date = new Date(this.calendarYear(), this.calendarMonthIndex(), 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  });

  protected readonly effectiveCalendarDays = computed(() => {
    const totalDays = new Date(this.calendarYear(), this.calendarMonthIndex() + 1, 0).getDate();
    return Array.from({ length: totalDays }, (_, index) => index + 1);
  });

  protected readonly effectiveEmptyDays = computed(() => {
    const firstDay = new Date(this.calendarYear(), this.calendarMonthIndex(), 1).getDay();
    const offset = (firstDay + 6) % 7;
    return Array.from({ length: offset }, (_, i) => i);
  });

  protected readonly effectiveToday = computed(() => {
    const today = new Date();
    if (this.calendarYear() === today.getFullYear() && this.calendarMonthIndex() === today.getMonth()) {
      return today.getDate();
    }
    return 0;
  });

  protected readonly myTasks = computed(() => {
    const currentUserId = this.currentUserId();
    const currentUsername = this.currentUsername();
    return this.tasks().filter((task) => isTaskOwner(task, currentUserId, currentUsername));
  });

  protected readonly effectiveTaskDays = computed(() => {
    const monthStr = `${this.calendarYear()}-${String(this.calendarMonthIndex() + 1).padStart(2, '0')}`;
    return this.myTasks()
      .filter((task) => !task.completed && task.status !== 'completed' && task.dueDate && task.dueDate.startsWith(monthStr))
      .map((task) => Number(task.dueDate.slice(-2)))
      .filter((day) => Number.isInteger(day) && day > 0);
  });

  protected readonly selectedCalendarDateStr = computed(() => {
    const day = this.selectedDay();
    if (!day) return null;
    return `${this.calendarYear()}-${String(this.calendarMonthIndex() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });

  protected readonly selectedCalendarDateFormatted = computed(() => {
    const day = this.selectedDay();
    if (!day) return 'All Scheduled Dates';
    const date = new Date(this.calendarYear(), this.calendarMonthIndex(), day);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  });

  protected readonly selectedDateTasks = computed(() => {
    const selectedDate = this.selectedCalendarDateStr();
    if (!selectedDate) {
      return this.tasks().filter((task) => !task.completed);
    }
    return this.tasks().filter((task) => task.dueDate === selectedDate);
  });

  protected readonly menuItems = computed<ActionMenuItem[]>(() => {
    const items: ActionMenuItem[] = [
      { id: 'today', label: 'Jump to Today' },
      { id: 'prev', label: 'Previous Month' },
      { id: 'next', label: 'Next Month' }
    ];
    if (this.selectedDay() !== null) {
      items.push({ id: 'clear', label: 'Clear Selected Date', destructive: true });
    }
    return items;
  });

  protected hasTask(day: number): boolean {
    return this.effectiveTaskDays().includes(day);
  }

  protected selectDay(day: number): void {
    if (this.variant() === 'picker') {
      this.selectedDay.set(this.selectedDay() === day ? null : day);
      return;
    }
    if (this.selectedDay() === day) {
      this.selectedDay.set(null);
      return;
    }
    this.selectedDay.set(day);
  }

  protected onMenuAction(action: string): void {
    if (action === 'prev') this.onCalendarPrevMonth();
    if (action === 'next') this.onCalendarNextMonth();
    if (action === 'today') this.onCalendarJumpToday();
    if (action === 'clear') this.selectedDay.set(null);
  }

  protected onCalendarPrevMonth(): void {
    if (this.calendarMonthIndex() === 0) {
      this.calendarMonthIndex.set(11);
      this.calendarYear.update((year) => year - 1);
    } else {
      this.calendarMonthIndex.update((month) => month - 1);
    }
    if (this.variant() === 'schedule') {
      this.selectedDay.set(null);
    }
  }

  protected onCalendarNextMonth(): void {
    if (this.calendarMonthIndex() === 11) {
      this.calendarMonthIndex.set(0);
      this.calendarYear.update((year) => year + 1);
    } else {
      this.calendarMonthIndex.update((month) => month + 1);
    }
    if (this.variant() === 'schedule') {
      this.selectedDay.set(null);
    }
  }

  protected onCalendarJumpToday(): void {
    const today = new Date();
    this.calendarYear.set(today.getFullYear());
    this.calendarMonthIndex.set(today.getMonth());
    if (this.variant() === 'schedule') {
      this.selectedDay.set(today.getDate());
    }
  }

  protected toggleTask(id: number): void {
    this.taskToggled.emit(id);
  }

  protected deleteTask(id: number): void {
    this.taskDeleted.emit(id);
  }

  protected editTask(task: Task): void {
    this.taskEdited.emit(task);
  }

  protected openTaskDetail(task: Task): void {
    this.taskSelected.emit(task);
  }

  protected onStatusChanged(event: { id: number; status: TaskStatus }): void {
    this.taskStatusChanged.emit(event);
  }
}
