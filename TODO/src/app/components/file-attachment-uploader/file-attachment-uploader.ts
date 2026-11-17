import { Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskAttachment } from '../../models/task.model';
import { API_BASE_URL } from '../../core/api/api.config';

@Component({
  selector: 'app-file-attachment-uploader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-attachment-uploader.html',
  styleUrl: './file-attachment-uploader.css'
})
export class FileAttachmentUploaderComponent {
  readonly disabled = input<boolean>(false);
  readonly attachments = input<TaskAttachment[]>([]);
  readonly accept = input<string>('image/*,.pdf,.xls,.xlsx,.csv');
  readonly multiple = input<boolean>(true);
  readonly title = input<string>('Attachments');
  readonly subtitle = input<string>('Images, PDFs, spreadsheets, and files');

  readonly attachmentsChange = output<TaskAttachment[]>();

  protected readonly currentAttachments = signal<TaskAttachment[]>([]);
  protected readonly selectedImage = signal<string | null>(null);

  private readonly uploadBaseUrl = API_BASE_URL.replace(/\/api$/, '');

  protected readonly imageAttachments = computed(() =>
    this.currentAttachments().filter((a) => this.isImage(a.type))
  );

  protected readonly fileAttachments = computed(() =>
    this.currentAttachments().filter((a) => !this.isImage(a.type))
  );

  constructor() {
    effect(() => {
      this.currentAttachments.set(this.attachments() ?? []);
    }, { allowSignalWrites: true });
  }

  protected isImage(type: string): boolean {
    return type.startsWith('image/');
  }

  protected fileBadge(type: string): { label: string; class: string } {
    if (type.includes('pdf')) return { label: 'PDF', class: 'badge-pdf' };
    if (type.includes('excel') || type.includes('spreadsheet') || type.includes('sheet')) return { label: 'XLS', class: 'badge-excel' };
    return { label: 'FILE', class: 'badge-file' };
  }

  protected attachmentUrl(value: string): string {
    if (!value) return '';
    if (value.startsWith('data:') || /^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/')) return `${this.uploadBaseUrl}${value}`;
    return value;
  }

  protected openImage(dataUrl: string): void {
    this.selectedImage.set(this.attachmentUrl(dataUrl));
  }

  protected closeImage(): void {
    this.selectedImage.set(null);
  }

  protected downloadSelectedImage(): void {
    const imageUrl = this.selectedImage();
    if (imageUrl) this.downloadFile(imageUrl, 'image-attachment');
  }

  protected downloadFile(fileUrl: string, fileName: string): void {
    const href = this.attachmentUrl(fileUrl);
    if (!href) return;

    fetch(href)
      .then((response) => {
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName || 'download';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      })
      .catch(() => {
        const link = document.createElement('a');
        link.href = href;
        link.download = fileName || 'download';
        link.rel = 'noopener noreferrer';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
  }

  protected formatFileSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const nextAttachments = await Promise.all(
      files.map(async (file) => {
        const dataUrl = await this.readFileAsDataUrl(file);
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl
        } satisfies TaskAttachment;
      })
    );

    const updated = [...this.currentAttachments(), ...nextAttachments];
    this.currentAttachments.set(updated);
    this.attachmentsChange.emit(updated);
    input.value = '';
  }

  protected removeAttachment(id: string): void {
    const updated = this.currentAttachments().filter((a) => a.id !== id);
    this.currentAttachments.set(updated);
    this.attachmentsChange.emit(updated);
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });
  }
}
