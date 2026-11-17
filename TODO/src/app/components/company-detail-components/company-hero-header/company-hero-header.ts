import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Company } from '../../../models/company.model';

@Component({
  selector: 'app-company-hero-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-hero-header.html',
  styleUrl: './company-hero-header.css'
})
export class CompanyHeroHeaderComponent {
  @Input({ required: true }) company!: Company;
  @Input({ required: true }) primaryColor!: string;
  @Input() currentLogoUrl: string | null = null;
}
