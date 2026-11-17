import { Component, ElementRef, HostListener, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, AppNotification } from '../../core/notifications/notification.service';
import { TaskStoreService } from '../../services/task-store.service';
import { ROUTES } from '../../core/routing/route-paths';
import { API_BASE_URL } from '../../core/api/api.config';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css'
})
export class NotificationBellComponent {
  protected readonly notificationService = inject(NotificationService);
  private readonly taskStore = inject(TaskStoreService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  protected readonly isOpen = signal(false);
  protected readonly apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

  @Output() taskSelected = new EventEmitter<number>();

  protected toggleDropdown(): void {
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);
    if (nextState) {
      this.notificationService.refresh(true);
    }
  }

  protected closeDropdown(): void {
    this.isOpen.set(false);
  }

  protected onNotificationClick(item: AppNotification): void {
    if (!item.isRead) {
      this.notificationService.markAsRead(item.id).subscribe();
    }

    if (item.taskId) {
      this.taskSelected.emit(item.taskId);
      this.taskStore.setActiveTaskId(item.taskId);
      this.taskStore.setTaskReturnContext('dashboard');
      this.router.navigate(ROUTES.taskDetail);
    }

    this.closeDropdown();
  }

  protected markAllRead(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead().subscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  avatarUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiOrigin}${normalized}`;
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
