import { NonNullableFormBuilder } from '@angular/forms';
import { TaskPriority } from '../../../models/task.model';

export type TaskBoardPriorityFilter = 'all' | TaskPriority;
export type TaskBoardSort = 'created' | 'due' | 'priority';

export interface TaskBoardToolbarFormValue {
  searchTerm: string;
  priority: TaskBoardPriorityFilter;
  sortBy: TaskBoardSort;
}

export function createTaskBoardToolbarForm(fb: NonNullableFormBuilder) {
  return fb.group({
    searchTerm: fb.control(''),
    priority: fb.control<TaskBoardPriorityFilter>('all'),
    sortBy: fb.control<TaskBoardSort>('created')
  });
}
