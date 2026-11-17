import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Company } from '../../models/company.model';
import { API_BASE_URL } from '../../core/api/api.config';
import { getTenantDomainUrl } from '../../core/utils/domain.utils';

@Component({
  selector: 'app-company-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-card.html',
  styleUrl: './company-card.css'
})
export class CompanyCardComponent {
  @Input({ required: true }) company!: Company;
  @Output() statusChange = new EventEmitter<{ companyId: number; status: 'active' | 'rejected' | 'suspended' }>();
  @Output() approveClick = new EventEmitter<Company>();
  private readonly router = inject(Router);

  private readonly apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

  protected get logoUrl(): string | null {
    if (!this.company?.logoPath) return null;
    const path = this.company.logoPath;
    if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiOrigin}${clean}`;
  }

  protected getDomainUrl(dom: string): string {
    return getTenantDomainUrl(dom, '/login');
  }

  protected onManage(): void {
    if (this.company?.status === 'rejected') {
      return;
    }
    if (this.company?.id) {
      this.router.navigate(['/super-admin/companies', this.company.id]);
    }
  }

  protected onApprove(e: Event): void {
    e.stopPropagation();
    this.approveClick.emit(this.company);
  }

  protected onReject(e: Event): void {
    e.stopPropagation();
    this.statusChange.emit({ companyId: this.company.id, status: 'rejected' });
  }
}