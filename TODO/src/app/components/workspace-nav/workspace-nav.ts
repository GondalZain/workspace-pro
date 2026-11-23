import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { ROUTE_URL } from '../../core/routing/route-paths';
import { AssessmentApiService } from '../../core/api/assessment-api.service';
import { DeveloperAssessment } from '../../models/assessment.model';

// Persistent singleton cache to prevent any navigation flicker
const globalPendingAssessments = signal<DeveloperAssessment[]>([]);
let isFirstLoadDone = false;

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

  // Reads instantly from singleton cache — zero flicker across navigations
  protected readonly pendingAssessments = globalPendingAssessments;
  protected readonly pendingCount = computed(() => this.pendingAssessments().length);

  constructor() {
    if (!isFirstLoadDone) {
      this.refreshAssessments();
    }

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        // Silently update in background without resetting the current signal
        this.refreshAssessments();
      });
  }

  refreshAssessments(): void {
    this.assessmentApi.getMyPendingAssessments().subscribe({
      next: (list) => {
        globalPendingAssessments.set(list || []);
        isFirstLoadDone = true;
      },
      error: () => {}
    });
  }
}
