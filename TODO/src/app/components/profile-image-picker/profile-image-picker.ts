import { Component, computed, input, model, signal } from '@angular/core';

@Component({
  selector: 'app-profile-image-picker',
  standalone: true,
  templateUrl: './profile-image-picker.html',
  styleUrl: './profile-image-picker.css'
})
export class ProfileImagePickerComponent {
  readonly currentImageUrl = input<string | null>(null);
  /** Two-way selected upload; null when cleared. */
  readonly selectedFile = model<File | null>(null);
  /** Two-way: user chose to remove the existing server image. */
  readonly removeExisting = model(false);

  protected readonly selectedFileName = signal('');
  protected readonly selectedPreviewUrl = signal<string | null>(null);

  protected readonly previewUrl = computed(
    () => this.selectedPreviewUrl() ?? this.currentImageUrl()
  );

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedFileName.set(file?.name || '');
    this.selectedPreviewUrl.set(file ? URL.createObjectURL(file) : null);
    this.selectedFile.set(file);
    this.removeExisting.set(false);
  }

  protected clearSelection(): void {
    this.selectedFileName.set('');
    this.selectedPreviewUrl.set(null);
    this.selectedFile.set(null);
    this.removeExisting.set(true);
  }
}
