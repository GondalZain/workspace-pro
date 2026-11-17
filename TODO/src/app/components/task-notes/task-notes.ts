import { Component, ElementRef, ViewChild, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TaskApiService } from '../../core/api/task-api.service';
import { createTaskNoteForm, taskNoteFormValueFromRaw } from '../../core/forms';
import { FormFieldErrorComponent } from '../../shared/forms';
import { TaskNote } from '../../models/task-note.model';
import { API_BASE_URL } from '../../core/api/api.config';
import { UserMentionInputComponent } from '../user-mention-input/user-mention-input';
import { NotificationService } from '../../core/notifications/notification.service';
import { SubscriptionService } from '../../core/subscription/subscription.service';

@Component({
  selector: 'app-task-notes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    UserMentionInputComponent,
    RouterModule
  ],
  templateUrl: './task-notes.html',
  styleUrl: './task-notes.css'
})
export class TaskNotesComponent {
  readonly taskId = input.required<number>();

  @ViewChild('notesContainer') private notesContainer?: ElementRef<HTMLDivElement>;

  private readonly taskApi = inject(TaskApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly subscription = inject(SubscriptionService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly canPostNote = computed(() => this.subscription.hasFeature('tasks.mentions_comments'));
  protected readonly currentPlanId = computed(() => this.subscription.currentPlanId());
  protected readonly currentPlanName = computed(() => {
    const id = this.currentPlanId();
    return id === 'ultra' ? 'Ultra Plan' : (id === 'pro' || id === 'monthly' ? 'Pro Plan' : 'Free Trial');
  });
  protected readonly apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  protected readonly notes = signal<TaskNote[]>([]);
  protected readonly form = createTaskNoteForm(this.fb);
  protected readonly submitAttempted = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected openUpgradeModal(): void {
    this.subscription.openModal('tasks.mentions_comments');
  }

  constructor() {
    effect(() => {
      const id = this.taskId();
      if (id) {
        this.loadNotes(id);
      }
    });
  }

  loadNotes(id: number) {
    this.isLoading.set(true);
    this.error.set(null);

    this.taskApi.getNotes(id).subscribe({
      next: (data) => {
        this.notes.set(data || []);
        this.isLoading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Failed to load task notes:', err);
        this.error.set('Failed to load notes');
        this.isLoading.set(false);
      }
    });
  }

  formatNoteContent(content: string): SafeHtml {
    if (!content) return '';
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');

    const formatted = escaped.replace(
      /@([a-zA-Z0-9_\.\-]+)/g,
      '<span class="mention-tag">@$1</span>'
    );
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  hasMention(content: string): boolean {
    return !!content && /@([a-zA-Z0-9_\.\-]+)/.test(content);
  }

  submitNote() {
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();
    const { content } = taskNoteFormValueFromRaw(this.form.getRawValue());
    if (!content || this.isSubmitting()) {
      return;
    }
    this.submitAttempted.set(false);

    this.isSubmitting.set(true);
    this.error.set(null);

    this.taskApi.addNote(this.taskId(), content).subscribe({
      next: (newNote) => {
        this.notes.update((prev) => [...prev, newNote]);
        this.form.reset({ content: '' });
        this.isSubmitting.set(false);
        this.notificationService.refresh(true);
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Failed to submit note:', err);
        this.error.set(err.error?.error || 'Failed to add note');
        this.isSubmitting.set(false);
      }
    });
  }

  formatTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
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

  private scrollToBottom() {
    setTimeout(() => {
      if (this.notesContainer?.nativeElement) {
        this.notesContainer.nativeElement.scrollTop = this.notesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
