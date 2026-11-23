import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { ROUTE_URL } from '../../core/routing/route-paths';
import { AssessmentApiService } from '../../core/api/assessment-api.service';
import { DeveloperAssessment } from '../../models/assessment.model';

@Component({
  selector: 'app-workspace-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './workspace-nav.html',
  styleUrl: './workspace-nav.css'
})
export class WorkspaceNavComponent {
  private readonly assessmentApi = inject(AssessmentApiService);
  private readonly router = inject(Router);

  protected readonly url = ROUTE_URL;

  protected readonly pendingAssessments = signal<DeveloperAssessment[]>([]);
  protected readonly totalAssessmentsCount = signal<number>(0);

  constructor() {
    this.loadAssessments();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.loadAssessments();
      });
  }

  loadAssessments(): void {
    this.assessmentApi.getMyPendingAssessments().subscribe({
      next: (list) => this.pendingAssessments.set(list || []),
      error: () => {}
    });

    this.assessmentApi.getMyAllAssessments().subscribe({
      next: (list) => this.totalAssessmentsCount.set((list || []).length),
      error: () => {}
    });
  }
}
