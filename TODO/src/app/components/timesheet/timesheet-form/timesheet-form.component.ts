import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NewTimesheetEntry } from '../../../models/timesheet.model';
import { TaskStoreService } from '../../../services/task-store.service';
import { ProjectStoreService } from '../../../services/project-store.service';
import { isOpenTask } from '../../../models/task.model';

@Component({
  selector: 'app-timesheet-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './timesheet-form.component.html',
  styleUrl: './timesheet-form.component.css'
})
export class TimesheetFormComponent implements OnInit, OnChanges {
  @Input() presetTaskTitle?: string;
  @Input() presetProjectTitle?: string;
  @Input() autoOpen = false;
  @Input() buttonAlign: 'left' | 'right' = 'right';
  @Input() alignLeft = false;

  @Output() entryAdded = new EventEmitter<NewTimesheetEntry>();

  private readonly fb = inject(FormBuilder);
  private readonly taskStore = inject(TaskStoreService);
  private readonly projectStore = inject(ProjectStoreService);

  readonly tasks = this.taskStore.tasks;
  readonly projects = this.projectStore.projects;
  readonly isOpen = signal(false);
  readonly showTimeError = signal(false);
  readonly selectedProjectTitle = signal<string>('');

  readonly filteredTasks = computed(() => {
    const projTitle = this.selectedProjectTitle();
    const activeTasks = this.tasks().filter((t) => isOpenTask(t));
    if (!projTitle) {
      return activeTasks;
    }
    const matchingProject = this.projects().find(
      (p) => p.title.trim().toLowerCase() === projTitle.trim().toLowerCase()
    );
    if (!matchingProject) {
      return activeTasks;
    }
    return activeTasks.filter((t) => Number(t.projectId) === Number(matchingProject.id));
  });

  readonly todayDate = new Date().toISOString().split('T')[0];

  readonly form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(250)]],
    project: [''],
    task: [''],
    hours: [null, [Validators.min(0), Validators.max(999)]],
    minutes: [null, [Validators.min(0), Validators.max(59)]],
    date: [this.todayDate]
  });

  constructor() {
    this.projectStore.refresh();
    this.taskStore.refresh();
  }

  ngOnInit(): void {
    if (this.autoOpen) {
      this.isOpen.set(true);
    }
    this.applyPresets();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['presetTaskTitle'] || changes['presetProjectTitle']) {
      this.applyPresets();
    }
  }

  private applyPresets(): void {
    if (this.presetProjectTitle) {
      this.selectedProjectTitle.set(this.presetProjectTitle);
      this.form.patchValue({ project: this.presetProjectTitle });
    }
    if (this.presetTaskTitle) {
      const currentTitle = this.form.get('title')?.value;
      this.form.patchValue({
        task: this.presetTaskTitle,
        title: currentTitle ? currentTitle : `Work on: ${this.presetTaskTitle}`
      });
    }
  }

  toggleForm(): void {
    this.isOpen.update((v) => !v);
  }

  onProjectChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedProjectTitle.set(val || '');

    const currentTask = this.form.get('task')?.value;
    if (currentTask) {
      const exists = this.filteredTasks().some(
        (t) => t.title.trim().toLowerCase() === currentTask.trim().toLowerCase()
      );
      if (!exists) {
        this.form.patchValue({ task: '' });
      }
    }
  }

  private getFormattedTime(): string {
    const h = Math.max(0, Number(this.form.value.hours) || 0);
    const m = Math.max(0, Number(this.form.value.minutes) || 0);
    if (h === 0 && m === 0) return '';
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  onSubmit(): void {
    const formattedTime = this.getFormattedTime();
    if (this.form.invalid || !formattedTime) {
      this.form.markAllAsTouched();
      this.showTimeError.set(!formattedTime);
      return;
    }
    this.showTimeError.set(false);

    const value = this.form.value;
    const entry: NewTimesheetEntry = {
      title: value.title.trim(),
      description: value.description ? value.description.trim() : '-',
      task: value.task ? value.task.trim() : '-',
      project: value.project ? value.project.trim() : '-',
      time: formattedTime,
      date: value.date || this.todayDate
    };

    this.entryAdded.emit(entry);
    this.form.reset({ hours: null, minutes: null, date: this.todayDate, project: '', task: '' });
    this.selectedProjectTitle.set('');
    this.applyPresets();
    this.isOpen.set(false);
  }

  onCancel(): void {
    this.form.reset({ hours: null, minutes: null, date: this.todayDate, project: '', task: '' });
    this.selectedProjectTitle.set('');
    this.applyPresets();
    this.showTimeError.set(false);
    this.isOpen.set(false);
  }
}

