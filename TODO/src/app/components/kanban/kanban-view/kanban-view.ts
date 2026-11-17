import { Component, computed, inject, input, model, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Task, TaskPriority, TaskScope, TaskStatus } from '../../../models/task.model';
import { TaskBoardToolbarComponent } from '../../task-board-toolbar/task-board-toolbar';
import { KanbanBoardComponent } from '../../kanban-board/kanban-board';
import { ROUTE_URL } from '../../../core/routing/route-paths';
import { SubscriptionService } from '../../../core/subscription/subscription.service';

@Component({
  selector: 'app-kanban-view',
  standalone: true,
  imports: [RouterModule, TaskBoardToolbarComponent, KanbanBoardComponent],
  templateUrl: './kanban-view.html',
  styleUrl: './kanban-view.css'
})
export class KanbanViewComponent {
  private readonly subService = inject(SubscriptionService);
  protected readonly taskNewUrl = ROUTE_URL.taskNew;
  readonly tasks = input.required<Task[]>();
  readonly totalCount = input<number | null>(null);

  protected readonly canDragDrop = computed(() => this.subService.hasFeature('kanban.drag_drop'));

  protected openUpgradeModal(): void {
    this.subService.openModal('kanban.drag_drop');
  }

  readonly searchTerm = model('');
  readonly selectedPriority = model<'all' | TaskPriority>('all');
  readonly selectedScope = model<TaskScope>('all');

  readonly showScopeToggle = input(true);
  readonly canCreateTasks = input(false);
  readonly searchPlaceholder = input('Search by title, category, or tags…');

  readonly currentUserId = input<number | null | undefined>(null);
  readonly currentUsername = input<string | null | undefined>(null);
  readonly isAdmin = input(false);

  readonly taskSelected = output<Task>();
  readonly taskEdited = output<Task>();
  readonly taskDeleted = output<number>();
  readonly quickAddClicked = output<TaskStatus>();
  readonly taskStatusChanged = output<{ id: number; status: TaskStatus }>();
}
