import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CompanyDetailTab = 'profile' | 'colors' | 'admins' | 'permissions' | 'statuses' | 'metrics';

@Component({
  selector: 'app-company-detail-tab-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-detail-tab-bar.html',
  styleUrl: './company-detail-tab-bar.css'
})
export class CompanyDetailTabBarComponent {
  @Input({ required: true }) activeTab!: CompanyDetailTab;
  @Output() activeTabChange = new EventEmitter<CompanyDetailTab>();

  @Input() adminCount: number = 0;

  selectTab(tab: CompanyDetailTab): void {
    this.activeTabChange.emit(tab);
  }
}
