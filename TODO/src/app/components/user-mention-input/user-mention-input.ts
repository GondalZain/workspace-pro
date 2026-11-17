import { Component, ElementRef, HostListener, Input, ViewChild, computed, forwardRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { AdminApiService } from '../../core/api/admin-api.service';
import { User } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/api/api.config';

@Component({
  selector: 'app-user-mention-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-mention-input.html',
  styleUrl: './user-mention-input.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UserMentionInputComponent),
      multi: true
    }
  ]
})
export class UserMentionInputComponent implements ControlValueAccessor {
  @Input() placeholder = 'Add a log entry… (Type @ to tag a user)';
  @Input() rows = 4;
  @Input() disabled = false;
  @Input() customUsers?: User[];

  @ViewChild('editorRef') private editorRef?: ElementRef<HTMLDivElement>;

  private readonly adminApi = inject(AdminApiService);
  protected readonly apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

  protected readonly textValue = signal('');
  protected readonly loadedUsers = signal<User[]>([]);
  protected readonly showMentionMenu = signal(false);
  protected readonly mentionQuery = signal('');
  protected readonly mentionSelectedIndex = signal(0);
  private activeRange: Range | null = null;

  onChange: (val: string) => void = () => {};
  onTouched: () => void = () => {};

  protected readonly availableUsers = computed(() => {
    if (this.customUsers && this.customUsers.length > 0) {
      return this.customUsers;
    }
    return this.loadedUsers();
  });

  protected readonly filteredUsers = computed(() => {
    const q = this.mentionQuery().toLowerCase().trim();
    const all = this.availableUsers();
    const mentionedCounts = new Map<string, number>();
    for (const match of this.textValue().matchAll(/@([a-zA-Z0-9_.-]+)/g)) {
      const username = match[1].toLowerCase();
      mentionedCounts.set(username, (mentionedCounts.get(username) ?? 0) + 1);
    }

    if (this.showMentionMenu() && /^[a-zA-Z0-9_.-]+$/.test(q)) {
      const activeUsername = q.toLowerCase();
      const count = mentionedCounts.get(activeUsername) ?? 0;
      if (count <= 1) {
        mentionedCounts.delete(activeUsername);
      } else {
        mentionedCounts.set(activeUsername, count - 1);
      }
    }

    const available = all.filter((user) => !mentionedCounts.has(user.username.toLowerCase()));
    if (!q) return available.slice(0, 8);
    return available
      .filter((u) => 
        (u.username && u.username.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      )
      .slice(0, 8);
  });

  protected readonly hasMentionActive = computed(() => {
    return /@([a-zA-Z0-9_\.\-]+)/.test(this.textValue());
  });

  constructor() {
    this.loadUsers();
  }

  private loadUsers() {
    this.adminApi.listUsers().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data as any)?.users || [];
        this.loadedUsers.set(list);
      },
      error: (err) => console.warn('Could not load users for mentions:', err)
    });
  }

  writeValue(val: string): void {
    const cleanVal = val || '';
    this.textValue.set(cleanVal);
    if (this.editorRef?.nativeElement && this.editorRef.nativeElement.innerText.trim() !== cleanVal.trim()) {
      this.renderFormattedHtml(cleanVal);
    }
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onEditorInput() {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return;

    const text = (editor.innerText || '').replace(/\u00A0/g, ' ');
    this.textValue.set(text);
    this.onChange(text);
    this.onTouched();

    this.checkMentionTrigger();
  }

  private checkMentionTrigger() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      this.showMentionMenu.set(false);
      return;
    }

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
      this.showMentionMenu.set(false);
      return;
    }

    const textBeforeCursor = node.textContent?.slice(0, range.startOffset) || '';
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (/\s/.test(charBeforeAt) || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!/\s/.test(query)) {
          this.activeRange = range.cloneRange();
          this.mentionQuery.set(query);
          this.mentionSelectedIndex.set(0);
          this.showMentionMenu.set(true);
          return;
        }
      }
    }
    this.showMentionMenu.set(false);
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.showMentionMenu() && this.filteredUsers().length > 0) {
      const list = this.filteredUsers();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.mentionSelectedIndex.update((idx) => (idx + 1) % list.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.mentionSelectedIndex.update((idx) => (idx - 1 + list.length) % list.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const selected = list[this.mentionSelectedIndex()];
        if (selected) {
          this.selectMentionUser(selected);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.showMentionMenu.set(false);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const form = this.editorRef?.nativeElement.closest('form');
      if (form) {
        form.requestSubmit();
      }
    }
  }

  selectMentionUser(user: User) {
    const editor = this.editorRef?.nativeElement;
    const sel = window.getSelection();
    if (!editor || !sel) return;

    if (this.activeRange) {
      const node = this.activeRange.startContainer;
      const text = node.textContent || '';
      const lastAtIndex = text.lastIndexOf('@', this.activeRange.startOffset);

      if (lastAtIndex !== -1) {
        const before = text.slice(0, lastAtIndex);
        const after = text.slice(this.activeRange.startOffset);

        const parent = node.parentNode;
        if (parent) {
          const mentionSpan = document.createElement('span');
          mentionSpan.className = 'whatsapp-mention';
          mentionSpan.textContent = `@${user.username}`;

          const spaceNode = document.createTextNode(' ');

          const beforeNode = document.createTextNode(before);
          const afterNode = document.createTextNode(after);

          parent.insertBefore(beforeNode, node);
          parent.insertBefore(mentionSpan, node);
          parent.insertBefore(spaceNode, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);

          const newRange = document.createRange();
          newRange.setStartAfter(spaceNode);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        }
      }
    }

    this.showMentionMenu.set(false);
    const fullText = (editor.innerText || '').replace(/\u00A0/g, ' ');
    this.textValue.set(fullText);
    this.onChange(fullText);
    this.onTouched();
  }

  private renderFormattedHtml(text: string) {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return;

    if (!text) {
      editor.innerHTML = '';
      return;
    }

    const formatted = text.replace(
      /@([a-zA-Z0-9_\.\-]+)/g,
      '<span class="whatsapp-mention">@$1</span>'
    );
    editor.innerHTML = formatted;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-mention-container')) {
      this.showMentionMenu.set(false);
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
}
