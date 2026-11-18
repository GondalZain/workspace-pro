import { Component, computed, input, model, signal } from '@angular/core';
import { optimizeImageFile } from '../../shared/utils/image-file.util';

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

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) {
      this.clearSelection();
      return;
    }

    try {
      // Downscale avatar to max 800x800 at 0.85 quality (~50KB)
      const optimized = await optimizeImageFile(file, { maxDimension: 800, quality: 0.85 });
      this.selectedFileName.set(optimized.file.name);
      this.selectedPreviewUrl.set(optimized.dataUrl);
      this.selectedFile.set(optimized.file);
      this.removeExisting.set(false);
    } catch {
      this.selectedFileName.set(file.name);
      this.selectedPreviewUrl.set(URL.createObjectURL(file));
      this.selectedFile.set(file);
      this.removeExisting.set(false);
    }
  }

  protected clearSelection(): void {
    this.selectedFileName.set('');
    this.selectedPreviewUrl.set(null);
    this.selectedFile.set(null);
    this.removeExisting.set(true);
  }
}
