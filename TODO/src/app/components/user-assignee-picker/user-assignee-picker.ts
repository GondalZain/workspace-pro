import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model';
import { API_BASE_URL } from '../../core/api/api.config';
import { AdminApiService } from '../../core/api/admin-api.service';
import { AuthService, User } from '../../core/auth/auth.service';

@Component({
  selector: 'app-user-assignee-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-assignee-picker.html',
  styleUrl: './user-assignee-picker.css'
})
export class UserAssigneePickerComponent {
  readonly task = input<Task | null>(null);
  readonly assigneeIds = input<number[]>([]);
  readonly label = input<string>('Assign Ticket To');
  readonly showCreator = input<boolean>(true);
  readonly showHeaderCount = input<boolean>(true);

  readonly assigneeIdsChange = output<number[]>();

  private readonly adminApi = inject(AdminApiService);
  private readonly authService = inject(AuthService);

  protected readonly allUsers = signal<User[]>([]);
  protected readonly currentUser = signal<User | null>(this.authService.getUser());
  protected readonly selectedAssigneeIds = signal<number[]>([]);
  protected readonly isDropdownOpen = signal(false);

  private readonly uploadBaseUrl = API_BASE_URL.replace(/\/api$/, '');

  protected readonly nonAdminUsers = computed(() =>
    this.allUsers().filter((u) => u.role !== 'admin')
  );

  protected readonly creatorName = computed(() => {
    const t = this.task();
    if (t?.creatorUsername) return t.creatorUsername;
    const curr = this.currentUser();
    return curr?.username ?? 'You';
  });

  protected readonly creatorUser = computed(() => {
    const t = this.task();
    if (t?.userId) {
      const match = this.allUsers().find((u) => u.id === Number(t.userId));
      if (match) return match;
    }
    const curr = this.currentUser();
    if (curr) return curr;
    return null;
  });

  protected readonly selectedAssigneeUsers = computed(() => {
    const ids = this.selectedAssigneeIds();
    return this.allUsers().filter((u) => ids.includes(u.id));
  });

  constructor() {
    this.loadUsers();

    effect(() => {
      const ids = this.assigneeIds();
      this.selectedAssigneeIds.set(ids ?? []);
    }, { allowSignalWrites: true });
  }

  private loadUsers(): void {
    this.adminApi.listUsers().subscribe({
      next: (users) => this.allUsers.set(users),
      error: () => this.allUsers.set([])
    });
  }

  protected profileImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/')) return `${this.uploadBaseUrl}${path}`;
    return `${this.uploadBaseUrl}/${path}`;
  }

  protected isAssigneeSelected(userId: number): boolean {
    return this.selectedAssigneeIds().includes(userId);
  }

  protected toggleAssignee(userId: number): void {
    const current = this.selectedAssigneeIds();
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    this.selectedAssigneeIds.set(next);
    this.assigneeIdsChange.emit(next);
  }

  protected toggleDropdown(): void {
    this.isDropdownOpen.update((v) => !v);
  }

  protected closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  protected selectAssignee(userId: number): void {
    if (!this.isAssigneeSelected(userId)) {
      this.toggleAssignee(userId);
    }
    this.isDropdownOpen.set(false);
  }

  protected assignSelf(): void {
    const user = this.currentUser();
    if (!user) return;
    if (!this.isAssigneeSelected(user.id)) {
      this.toggleAssignee(user.id);
    }
  }
}
