import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TaskApiService } from '../../../core/api/task-api.service';
import { TaskStatusItem } from '../../../models/task.model';
import { StatusTemplate } from '../statuses/statuses.page';
import { TaskStoreService } from '../../../services/task-store.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SubscriptionService } from '../../../core/subscription/subscription.service';
import { ROUTE_URL } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-admin-status-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './status-detail.page.html',
  styleUrl: './status-detail.page.css'
})
export class AdminStatusDetailPage implements OnInit {
  protected readonly url = ROUTE_URL;

  private readonly api = inject(TaskApiService);
  private readonly taskStore = inject(TaskStoreService);
  private readonly auth = inject(AuthService);
  private readonly subService = inject(SubscriptionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly canManageStatuses = computed(() => this.subService.hasFeature('tasks.dynamic_statuses'));
  protected readonly currentUser = signal(this.auth.getUser());
  protected readonly templateId = signal<number>(0);
  protected readonly template = signal<StatusTemplate | null>(null);
  protected readonly statuses = signal<TaskStatusItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected openUpgradeModal(): void {
    this.subService.openModal('tasks.dynamic_statuses');
  }

  // Add Status Bar
  protected readonly newName = signal('');
  protected readonly newColor = signal('#2563eb');
  protected readonly newStageType = signal<'initial' | 'normal' | 'completed'>('normal');

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
        // If the selected item became initial, others cannot be initial
        if (type === 'initial' && s.isInitial) {
          return { ...s, isInitial: false };
        }
        return s;
      })
    );
  }

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    const id = rawId !== null && rawId !== undefined && rawId !== '' ? Number(rawId) : NaN;
    this.templateId.set(isNaN(id) ? 0 : id);
    this.loadPipeline(this.templateId());
  }

  private loadPipeline(tplId: number): void {
    this.isLoading.set(true);
    this.api.getStatusTemplates().subscribe({
      next: (tpls) => {
        const found = (tpls || []).find((t) => t.id === tplId);
        if (found) {
          this.template.set(found);
          this.statuses.set(
            (found.statuses || []).map((s: TaskStatusItem, idx: number) => ({
              ...s,
              sortOrder: s.sortOrder || idx + 1
            }))
          );
        } else {
          // Fallback to loading current statuses
          this.api.getStatuses().subscribe({
            next: (list) => {
              this.statuses.set(list || []);
              this.template.set({
                id: tplId,
                name: tplId === 0 ? 'System Default Pipeline' : 'Custom Pipeline',
                description: '',
                isSystem: tplId === 0,
                statuses: list || []
              });
            }
          });
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Could not load pipeline details.');
      }
    });
  }

  protected isCurrentCompanyActive(): boolean {
    const userCompanyId = Number(this.currentUser()?.companyId || this.currentUser()?.company?.id) || 0;
    const currentStatuses = this.statuses();
    const isCustomActive = currentStatuses.length > 0 && currentStatuses.some((s) => Number(s.companyId) === userCompanyId && userCompanyId > 0);

    if (isCustomActive) {
      return this.templateId() === userCompanyId;
    }
    return this.templateId() === 0;
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
    this.errorMessage.set('');
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

  protected toggleInitial(index: number): void {
    this.statuses.update((prev) =>
      prev.map((s, i) => ({
        ...s,
        isInitial: i === index ? !s.isInitial : false
      }))
    );
  }

  protected toggleCompleted(index: number): void {
    this.statuses.update((prev) =>
      prev.map((s, i) => (i === index ? { ...s, isCompleted: !s.isCompleted } : s))
    );
  }

  protected removeStatus(index: number): void {
    this.statuses.update((prev) => prev.filter((_, i) => i !== index));
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

  protected saveChanges(): void {
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
        this.statuses.set(res);
        this.taskStore.refreshStatuses();
        this.successMessage.set('Company task statuses updated and saved successfully!');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to save status changes.');
      }
    });
  }

  protected applyToCompany(): void {
    const userCompanyId = Number(this.currentUser()?.companyId || this.currentUser()?.company?.id) || 0;
    if (this.templateId() === 0 && userCompanyId > 0) {
      this.isSaving.set(true);
      this.api.deleteStatusTemplate(userCompanyId).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.taskStore.refreshStatuses();
          this.successMessage.set('Switched to System Default Statuses successfully!');
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.error || 'Failed to switch to System Default Statuses.');
        }
      });
      return;
    }
    this.saveChanges();
  }
}
