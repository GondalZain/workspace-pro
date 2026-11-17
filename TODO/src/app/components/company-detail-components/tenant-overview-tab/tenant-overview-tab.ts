import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from '../../stat-card/stat-card';
import { Company } from '../../../models/company.model';

@Component({
  selector: 'app-tenant-overview-tab',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  templateUrl: './tenant-overview-tab.html',
  styleUrl: './tenant-overview-tab.css'
})
export class TenantOverviewTabComponent {
  @Input({ required: true }) company!: Company;
}
