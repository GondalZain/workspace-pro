import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AssessmentApiService } from '../../core/api/assessment-api.service';
import { ROUTE_URL } from '../../core/routing/route-paths';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.css'
})
export class AdminSidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly assessmentApi = inject(AssessmentApiService);

  readonly companyName = input<string>('Company Admin');
  readonly companyTitle = input<string>('Management');
  readonly companyLogo = input<string | null>(null);
  readonly companyDescription = input<string>('');
  readonly userCount = input<number>(0);
  readonly roleCount = input<number>(0);

  protected readonly url = ROUTE_URL;
  protected readonly companyInitial = computed(() => (this.companyName() || 'C').charAt(0).toUpperCase());
  protected readonly myPendingCount = signal<number>(0);

  constructor() {
    this.assessmentApi.getMyPendingAssessments().subscribe({
      next: (list) => this.myPendingCount.set(list?.length || 0),
      error: () => {}
    });
  }

  protected logout(): void {
    this.auth.logout();
  }
}
