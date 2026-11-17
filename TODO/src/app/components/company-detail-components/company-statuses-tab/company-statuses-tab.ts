import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskStatusItem } from '../../../models/task.model';
import { SuperAdminApiService } from '../../../core/api/super-admin-api.service';
import { TaskApiService } from '../../../core/api/task-api.service';

@Component({
  selector: 'app-company-statuses-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-statuses-tab.html',
  styleUrl: './company-statuses-tab.css'
})
export class CompanyStatusesTabComponent implements OnInit {
  @Input({ required: true }) companyId!: number;
  @Input() companyName: string = '';
  @Input() primaryColor: string = '#0f766e';

  private readonly superAdminApi = inject(SuperAdminApiService);
  private readonly taskApi = inject(TaskApiService);

  protected readonly statuses = signal<TaskStatusItem[]>([]);
  protected readonly defaultTemplates = signal<any[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  // New Status Form
  protected readonly newName = signal('');
  protected readonly newColor = signal('#2563eb');
  protected readonly newStageType = signal<'initial' | 'normal' | 'completed'>('normal');

  // Inline editing row index (-1 for none)
  protected readonly editingIndex = signal<number>(-1);

  ngOnInit(): void {
    this.loadStatuses();
    this.loadDefaultTemplates();
  }

  protected loadStatuses(): void {
    if (!this.companyId) return;
    this.isLoading.set(true);
    this.superAdminApi.getCompanyStatuses(this.companyId).subscribe({
      next: (list) => {
        this.statuses.set(list || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to load company statuses.');
      }
    });
  }

  protected loadDefaultTemplates(): void {
    this.taskApi.getStatusTemplates().subscribe({
      next: (tpls) => {
        this.defaultTemplates.set(tpls || []);
      },
      error: () => this.defaultTemplates.set([])
    });
  }

  protected resetToStandard(): void {
    const sysDefault = this.defaultTemplates().find((t) => t.id === 0);
    if (sysDefault && Array.isArray(sysDefault.statuses) && sysDefault.statuses.length > 0) {
      this.statuses.set(
        sysDefault.statuses.map((s: TaskStatusItem, idx: number) => ({
          ...s,
          id: Date.now() + idx,
          sortOrder: idx + 1
        }))
      );
    } else {
      this.statuses.set([
        { id: Date.now() + 1, name: 'To Do', slug: 'pending', color: '#dc2626', sortOrder: 1, isInitial: true, isCompleted: false, isDefault: true },
        { id: Date.now() + 2, name: 'In Progress', slug: 'in-progress', color: '#2563eb', sortOrder: 2, isInitial: false, isCompleted: false, isDefault: true },
        { id: Date.now() + 3, name: 'Done', slug: 'completed', color: '#16a34a', sortOrder: 3, isInitial: false, isCompleted: true, isDefault: true }
      ]);
    }
    this.successMessage.set('Reset to Standard (3 Stages). Click "Save & Assign Statuses to Company" to persist.');
    setTimeout(() => this.successMessage.set(null), 3500);
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
    this.errorMessage.set(null);
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

    this.errorMessage.set(null);

    // Check with the backend if any tasks for this company are currently using this status stage
    const identifier = target.id || target.name;
    this.superAdminApi.checkCompanyStatusUsage(this.companyId, identifier).subscribe({
      next: (usage) => {
        if (!usage.canDelete) {
          this.errorMessage.set(
            `Cannot delete "${target.name}". There are currently ${usage.taskCount} active task(s) assigned to this status stage in this company. Please reassign those tasks before removing it.`
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
        // Fallback: If network check fails, allow local removal (backend will still enforce on save)
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

  protected saveStatuses(): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formatted = this.statuses().map((st, i) => ({
      ...st,
      companyId: this.companyId,
      sortOrder: i + 1
    }));

    this.superAdminApi.updateCompanyStatuses(this.companyId, formatted).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.statuses.set(res || []);
        this.successMessage.set('Company task statuses updated and assigned successfully!');
        setTimeout(() => this.successMessage.set(null), 3500);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to save company statuses.');
      }
    });
  }
}
