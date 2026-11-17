import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskApiService } from '../../../core/api/task-api.service';
import { TaskStatusItem } from '../../../models/task.model';
import { TaskStoreService } from '../../../services/task-store.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SubscriptionService } from '../../../core/subscription/subscription.service';
import { RouterModule } from '@angular/router';
import { ROUTE_URL } from '../../../core/routing/route-paths';

export interface StatusTemplate {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
  statuses: TaskStatusItem[];
}

@Component({
  selector: 'app-admin-statuses-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './statuses.page.html',
  styleUrl: './statuses.page.css'
})
export class AdminStatusesPage {
  protected readonly url = ROUTE_URL;

  private readonly api = inject(TaskApiService);
  private readonly taskStore = inject(TaskStoreService);
  private readonly auth = inject(AuthService);
  private readonly subService = inject(SubscriptionService);

  protected readonly canManageStatuses = computed(() => this.subService.hasFeature('tasks.dynamic_statuses'));
  protected readonly isExpired = computed(() => this.subService.isExpired());
  protected readonly currentUser = signal(this.auth.getUser());
  protected readonly currentCompany = computed(() => this.currentUser()?.company || null);

  protected readonly statuses = signal<TaskStatusItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected openUpgradeModal(): void {
    this.subService.openModal('tasks.dynamic_statuses');
  }

  // Add Status Bar Form
  protected readonly newName = signal('');
  protected readonly newColor = signal('#2563eb');
  protected readonly newStageType = signal<'initial' | 'normal' | 'completed'>('normal');

  // Inline editing row index
  protected readonly editingIndex = signal<number>(-1);

  constructor() {
    this.loadStatuses();
  }

  private loadStatuses(): void {
    this.isLoading.set(true);
    this.api.getStatuses().subscribe({
      next: (list) => {
        this.statuses.set(list || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Could not load company statuses.');
      }
    });
  }

  protected getStageType(st: TaskStatusItem): 'initial' | 'normal' | 'completed' {
    if (st.isInitial) return 'initial';
    if (st.isCompleted) return 'completed';
    return 'normal';
  }

  protected updateStageType(index: number, type: 'initial' | 'normal' | 'completed'): void {
    this.statuses.update((prev) =>
      prev.map((s, i) => {
        if (i === index) {
          return {
            ...s,
            isInitial: type === 'initial',
            isCompleted: type === 'completed'
          };
        }
        if (type === 'initial' && s.isInitial) {
          return { ...s, isInitial: false };
        }
        return s;
      })
    );
  }

  protected addStatus(): void {
    if (!this.canManageStatuses()) {
      this.openUpgradeModal();
      return;
    }

    const name = this.newName().trim();
    if (!name) {
      this.errorMessage.set('Status name is required.');
      return;
    }

    if (this.statuses().some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      this.errorMessage.set(`A status with the name "${name}" already exists.`);
      return;
    }

    const stageType = this.newStageType();
    const isInitialVal = stageType === 'initial';
    const isCompletedVal = stageType === 'completed';

    const newItem: TaskStatusItem = {
      name,
      color: this.newColor(),
      sortOrder: this.statuses().length + 1,
      isInitial: isInitialVal,
      isCompleted: isCompletedVal,
      isDefault: false
    };

    this.statuses.update((prev) => {
      const list = isInitialVal ? prev.map((s) => ({ ...s, isInitial: false })) : [...prev];
      return [...list, newItem];
    });

    this.newName.set('');
    this.newColor.set('#2563eb');
    this.newStageType.set('normal');
    this.errorMessage.set('');
  }

  protected toggleEditRow(index: number): void {
    if (this.editingIndex() === index) {
      this.editingIndex.set(-1);
    } else {
      this.editingIndex.set(index);
    }
  }

  protected updateStatusColor(index: number, newColor: string): void {
    this.statuses.update((prev) =>
      prev.map((s, i) => (i === index ? { ...s, color: newColor } : s))
    );
  }

  protected updateStatusName(index: number, newName: string): void {
    const trimmed = newName.trim();
    if (!trimmed) return;
    this.statuses.update((prev) =>
      prev.map((s, i) => (i === index ? { ...s, name: trimmed } : s))
    );
  }

  protected removeStatus(index: number): void {
    const target = this.statuses()[index];
    if (!target) return;

    this.errorMessage.set('');

    // Check with the backend if any tasks are currently using this status stage
    const identifier = target.id || target.name;
    this.api.checkStatusUsage(identifier).subscribe({
      next: (usage) => {
        if (!usage.canDelete) {
          this.errorMessage.set(
            `Cannot delete "${target.name}". There are currently ${usage.taskCount} active task(s) assigned to this status stage. Please reassign those tasks to another stage before removing it.`
          );
          return;
        }

        // If no tasks are assigned, safe to remove
        this.statuses.update((prev) => prev.filter((_, i) => i !== index));
        if (this.editingIndex() === index) {
          this.editingIndex.set(-1);
        } else if (this.editingIndex() > index) {
          this.editingIndex.update((curr) => curr - 1);
        }
      },
      error: () => {
        // Fallback: If verification fails, safely remove from local list (backend will still enforce on save)
        this.statuses.update((prev) => prev.filter((_, i) => i !== index));
      }
    });
  }


  protected moveUp(index: number): void {
    if (index <= 0) return;
    this.statuses.update((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy.map((st, i) => ({ ...st, sortOrder: i + 1 }));
    });
  }

  protected moveDown(index: number): void {
    if (index >= this.statuses().length - 1) return;
    this.statuses.update((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy.map((st, i) => ({ ...st, sortOrder: i + 1 }));
    });
  }

  protected saveAll(): void {
    if (!this.canManageStatuses()) {
      this.openUpgradeModal();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formatted = this.statuses().map((st, i) => ({
      ...st,
      sortOrder: i + 1
    }));

    this.api.updateStatuses(formatted).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.statuses.set(res || []);
        this.taskStore.refreshStatuses();
        this.successMessage.set('Company task statuses updated and saved successfully!');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to save status configuration.');
      }
    });
  }
}
