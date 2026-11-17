import { Component, inject, input, model } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { createTaskBoardToolbarForm, linkFormGroupToModels, TaskBoardSort } from '../../core/forms';
import { TaskPriority, TaskScope } from '../../models/task.model';

@Component({
  selector: 'app-task-board-toolbar',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './task-board-toolbar.html',
  styleUrl: './task-board-toolbar.css'
})
export class TaskBoardToolbarComponent {
  /** Two-way with parent: `[(searchTerm)]="searchTerm"`. */
  readonly searchTerm = model('');
  readonly selectedPriority = model<'all' | TaskPriority>('all');
  readonly selectedScope = model<TaskScope>('all');
  readonly sortBy = model<TaskBoardSort>('created');

  readonly searchPlaceholder = input('Search tasks...');
  readonly showScopeToggle = input(true);
  readonly inline = input(false);
  readonly showSort = input(false);

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = createTaskBoardToolbarForm(this.fb);

  constructor() {
    linkFormGroupToModels(this.form, {
      searchTerm: this.searchTerm,
      priority: this.selectedPriority,
      sortBy: this.sortBy
    });
  }
}
