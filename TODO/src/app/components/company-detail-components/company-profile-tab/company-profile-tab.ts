import { Component, EventEmitter, Input, Output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-company-profile-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-profile-tab.html',
  styleUrl: './company-profile-tab.css'
})
export class CompanyProfileTabComponent {
  companyName = model.required<string>();
  title = model<string>('');
  description = model<string>('');
  emailDomain = model<string>('');
  domain = model<string>('');
  status = model<'active' | 'suspended' | 'pending' | 'rejected'>('active');

  @Input({ required: true }) primaryColor!: string;
  @Input() currentLogoUrl: string | null = null;
  @Input() logoFile: File | null = null;
  @Input() isSaving: boolean = false;
  @Input() successMessage: string | null = null;
  @Input() errorMessage: string | null = null;

  @Output() fileSelected = new EventEmitter<Event>();
  @Output() clearLogo = new EventEmitter<void>();
  @Output() saveProfile = new EventEmitter<void>();
}
