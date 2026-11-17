import { Component, EventEmitter, Input, Output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PresetColor {
  name: string;
  primary: string;
  secondary: string;
}

@Component({
  selector: 'app-brand-colors-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-colors-tab.html',
  styleUrl: './brand-colors-tab.css'
})
export class BrandColorsTabComponent {
  primaryColor = model.required<string>();
  secondaryColor = model.required<string>();

  @Input() companyName: string = '';
  @Input() presetColors: PresetColor[] = [];
  @Input() isSaving: boolean = false;
  @Input() successMessage: string | null = null;
  @Input() errorMessage: string | null = null;

  @Output() setPreset = new EventEmitter<{ primary: string; secondary: string }>();
  @Output() saveColors = new EventEmitter<void>();

  onPrimaryChange(val: string): void {
    if (val && !val.startsWith('#') && val.length === 6) {
      val = '#' + val;
    }
    this.primaryColor.set(val);
  }

  onSecondaryChange(val: string): void {
    if (val && !val.startsWith('#') && val.length === 6) {
      val = '#' + val;
    }
    this.secondaryColor.set(val);
  }

  isPresetActive(preset: PresetColor): boolean {
    return (
      this.primaryColor()?.toLowerCase() === preset.primary.toLowerCase() &&
      this.secondaryColor()?.toLowerCase() === preset.secondary.toLowerCase()
    );
  }
}
