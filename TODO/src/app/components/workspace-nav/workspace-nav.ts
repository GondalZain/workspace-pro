import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { ROUTE_URL } from '../../core/routing/route-paths';
import { AssessmentApiService } from '../../core/api/assessment-api.service';
import { DeveloperAssessment } from '../../models/assessment.model';
import { DeveloperTestRunnerComponent } from '../assessments/test-runner/developer-test-runner.component';

@Component({
  selector: 'app-workspace-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, DeveloperTestRunnerComponent],
  templateUrl: './workspace-nav.html',
  styleUrl: './workspace-nav.css'
})
export class WorkspaceNavComponent {
  private readonly assessmentApi = inject(AssessmentApiService);
  private readonly router = inject(Router);

  protected readonly url = ROUTE_URL;

  protected readonly pendingAssessments = signal<DeveloperAssessment[]>([]);
  protected readonly showModal = signal<boolean>(false);
  protected readonly activeAssessmentId = signal<number | null>(null);
  protected readonly activeAssessment = signal<DeveloperAssessment | null>(null);

  constructor() {
    this.loadPendingAssessments();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.loadPendingAssessments();
      });
  }

  loadPendingAssessments(): void {
    this.assessmentApi.getMyPendingAssessments().subscribe({
      next: (list) => this.pendingAssessments.set(list || []),
      error: () => {}
    });
  }

  openPendingAssessment(assessment: DeveloperAssessment): void {
    this.activeAssessment.set(assessment);
    this.activeAssessmentId.set(assessment.id);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.activeAssessmentId.set(null);
    this.activeAssessment.set(null);
    this.loadPendingAssessments();
  }

  onAssessmentCompleted(_completed: DeveloperAssessment): void {
    this.closeModal();
  }
}
