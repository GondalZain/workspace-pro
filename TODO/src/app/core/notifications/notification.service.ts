import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { AuthService } from '../auth/auth.service';


export interface AppNotification {
  id: number;
  companyId: number | null;
  recipientUserId: number;
  actorUserId: number | null;
  actorName: string;
  actorProfileImage: string | null;
  type: string;
  title: string;
  message: string;
  taskId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${API_BASE_URL}/notifications`;

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly isLoading = signal<boolean>(false);

  private readonly statusesUpdatedSubject = new Subject<{ companyId?: number; statuses?: any[] }>();
  readonly statusesUpdated$ = this.statusesUpdatedSubject.asObservable();

  private readonly companySyncSubject = new Subject<{ event: string; data?: any }>();
  readonly companySync$ = this.companySyncSubject.asObservable();

  private readonly subscriptionPlanUpdatedSubject = new Subject<{ companyId?: number; planId: string; planName: string; subscriptionStatus: string }>();
  readonly subscriptionPlanUpdated$ = this.subscriptionPlanUpdatedSubject.asObservable();

  private pollIntervalSub: any = null;
  private eventSource: EventSource | null = null;
  private reconnectTimeout: any = null;


  constructor() {
    if (this.auth.getToken()) {
      this.refresh();
      this.initRealtimeStream();
      this.startPolling(10000); // Lightweight fallback polling
    }

    // Refresh immediately when tab gains focus or comes back online
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        if (this.auth.getToken()) {
          this.refresh(true);
          if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
            this.initRealtimeStream();
          }
        }
      });
      window.addEventListener('online', () => {
        if (this.auth.getToken()) {
          this.refresh(true);
          this.initRealtimeStream();
        }
      });
    }
  }

  /**
   * Connect to server-sent real-time notification stream (SSE)
   */
  initRealtimeStream(): void {
    const token = this.auth.getToken();
    if (!token || typeof EventSource === 'undefined') return;

    this.closeRealtimeStream();

    const streamUrl = `${this.apiUrl}/stream?token=${encodeURIComponent(token)}`;
    try {
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.addEventListener('new_notification', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.notification) {
            this.pushLiveNotification(data.notification, data.unreadCount);
          }
        } catch (e) {
          console.warn('Failed to parse SSE notification payload:', e);
        }
      });

      this.eventSource.addEventListener('unread_count', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && typeof data.unreadCount === 'number') {
            this.unreadCount.set(data.unreadCount);
          }
        } catch (e) {
          console.warn('Failed to parse SSE unread_count payload:', e);
        }
      });

      this.eventSource.addEventListener('statuses_updated', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.statusesUpdatedSubject.next(data || {});
        } catch (e) {
          console.warn('Failed to parse SSE statuses_updated payload:', e);
        }
      });

      this.eventSource.addEventListener('workspace_registered', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.companySyncSubject.next({ event: 'workspace_registered', data });
        } catch (e) {
          console.warn('Failed to parse SSE workspace_registered payload:', e);
        }
      });

      this.eventSource.addEventListener('company_status_changed', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.companySyncSubject.next({ event: 'company_status_changed', data });
        } catch (e) {
          console.warn('Failed to parse SSE company_status_changed payload:', e);
        }
      });

      this.eventSource.addEventListener('company_deleted', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.companySyncSubject.next({ event: 'company_deleted', data });
        } catch (e) {
          console.warn('Failed to parse SSE company_deleted payload:', e);
        }
      });

      this.eventSource.addEventListener('subscription_plan_updated', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.planId) {
            // Immediately update currentUser in AuthService so all signals & views react in real time
            const currentUser = this.auth.getUser();
            if (currentUser && (!data.companyId || currentUser.companyId === data.companyId)) {
              const updated = {
                ...currentUser,
                company: currentUser.company ? {
                  ...currentUser.company,
                  planId: data.planId,
                  subscriptionStatus: data.subscriptionStatus || 'active'
                } : null
              };
              this.auth.saveUser(updated);
            }
            this.subscriptionPlanUpdatedSubject.next(data);
          }
        } catch (e) {
          console.warn('Failed to parse SSE subscription_plan_updated payload:', e);
        }
      });


      this.eventSource.onerror = () => {
        this.closeRealtimeStream();
        // Exponential reconnect backoff after 5 seconds
        if (!this.reconnectTimeout && this.auth.getToken()) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.initRealtimeStream();
          }, 5000);
        }
      };
    } catch (err) {
      console.warn('EventSource connection failed, relying on fast polling fallback:', err);
    }
  }

  closeRealtimeStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Instantly merges a live incoming notification into the signal list
   */
  pushLiveNotification(newNotif: AppNotification, explicitUnreadCount?: number): void {
    this.notifications.update((list) => {
      // Prevent duplicates if already present
      const exists = list.some((item) => item.id === newNotif.id);
      if (exists) {
        return list.map((item) => (item.id === newNotif.id ? newNotif : item));
      }
      return [newNotif, ...list];
    });

    if (typeof explicitUnreadCount === 'number') {
      this.unreadCount.set(explicitUnreadCount);
    } else if (!newNotif.isRead) {
      this.unreadCount.update((c) => c + 1);
    }
  }

  startPolling(ms = 10000): void {
    this.stopPolling();
    this.pollIntervalSub = setInterval(() => {
      if (this.auth.getToken()) {
        this.refresh(true);
      }
    }, ms);
  }

  stopPolling(): void {
    if (this.pollIntervalSub) {
      clearInterval(this.pollIntervalSub);
      this.pollIntervalSub = null;
    }
  }

  refresh(silent = false): void {
    if (!this.auth.getToken()) return;
    if (!silent) this.isLoading.set(true);

    this.http.get<NotificationResponse>(this.apiUrl).subscribe({
      next: (res) => {
        this.notifications.set(res.notifications || []);
        this.unreadCount.set(res.unreadCount || 0);
        if (!silent) this.isLoading.set(false);
      },
      error: (err) => {
        if (!silent) this.isLoading.set(false);
        console.warn('Failed to fetch notifications:', err);
      }
    });
  }

  markAsRead(id: number): Observable<{ success: boolean; unreadCount: number }> {
    // Instant optimistic update on UI signal
    this.notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    this.unreadCount.update((c) => Math.max(0, c - 1));

    return this.http.put<{ success: boolean; unreadCount: number }>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<{ success: boolean; unreadCount: number }> {
    // Instant optimistic update on UI signal
    this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.unreadCount.set(0);

    return this.http.put<{ success: boolean; unreadCount: number }>(`${this.apiUrl}/read-all`, {});
  }
}
