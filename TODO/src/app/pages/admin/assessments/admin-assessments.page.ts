import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminPageHeaderComponent } from '../../../components/admin-page-header/admin-page-header';
import { AssessmentApiService } from '../../../core/api/assessment-api.service';
import { ProjectApiService } from '../../../core/api/project-api.service';
import { DeveloperAssessment } from '../../../models/assessment.model';
import { Project } from '../../../models/project.model';
import { DeveloperTestRunnerComponent } from '../../../components/assessments/test-runner/developer-test-runner.component';
import { ROUTE_URL } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-admin-assessments-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AdminPageHeaderComponent,
    DeveloperTestRunnerComponent
  ],
  templateUrl: './admin-assessments.page.html',
  styleUrls: ['./admin-assessments.page.css']
})
export class AdminAssessmentsPage {
  private readonly assessmentApi = inject(AssessmentApiService);
  private readonly projectApi = inject(ProjectApiService);
  private readonly router = inject(Router);

  protected readonly url = ROUTE_URL;
  protected readonly Math = Math;

  protected readonly assessments = signal<DeveloperAssessment[]>([]);
  protected readonly projects = signal<Project[]>([]);
  protected readonly loading = signal<boolean>(false);
  protected readonly actionMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  // Filters
  protected readonly selectedProjectFilter = signal<string>('all');
  protected readonly selectedStatusFilter = signal<string>('all');
  protected readonly selectedTierFilter = signal<string>('all');
  protected readonly searchTerm = signal<string>('');

  // Inspector modal
  protected readonly inspectingAssessmentId = signal<number | null>(null);
  protected readonly inspectingAssessment = signal<DeveloperAssessment | null>(null);
  protected readonly showInspectorModal = signal<boolean>(false);

  // Workflow running
  protected readonly runningWorkflowProjectId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.assessmentApi.getCompanyAssessments().subscribe({
      next: (list) => {
        this.assessments.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load company assessments.');
      }
    });

    this.projectApi.list().subscribe({
      next: (projs) => this.projects.set(projs),
      error: () => {}
    });
  }

  // Computed KPI Metrics
  protected readonly totalCount = computed(() => this.assessments().length);

  protected readonly evaluatedCount = computed(() => {
    return this.assessments().filter((a) => a.status === 'evaluated').length;
  });

  protected readonly pendingCount = computed(() => {
    return this.assessments().filter((a) => a.status !== 'evaluated').length;
  });

  protected readonly avgCompanyScore = computed(() => {
    const evaluated = this.assessments().filter((a) => a.score !== null && a.score !== undefined);
    if (evaluated.length === 0) return 0;
    const total = evaluated.reduce((sum, a) => sum + (a.score || 0), 0);
    return Math.round(total / evaluated.length);
  });

  protected readonly tierDistribution = computed(() => {
    const counts = { architect: 0, senior: 0, mid: 0, junior: 0 };
    for (const a of this.assessments()) {
      if (a.evaluatedLevel === 'Lead/Architect') counts.architect++;
      else if (a.evaluatedLevel === 'Senior') counts.senior++;
      else if (a.evaluatedLevel === 'Mid-Level') counts.mid++;
      else if (a.evaluatedLevel === 'Junior') counts.junior++;
    }
    return counts;
  });

  // Filtered Assessments
  protected readonly filteredAssessments = computed(() => {
    const list = this.assessments();
    const projFilter = this.selectedProjectFilter();
    const statusFilter = this.selectedStatusFilter();
    const tierFilter = this.selectedTierFilter();
    const search = this.searchTerm().trim().toLowerCase();

    return list.filter((item) => {
      // Project filter
      if (projFilter !== 'all' && String(item.projectId) !== projFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      // Tier filter
      if (tierFilter !== 'all' && item.evaluatedLevel !== tierFilter) {
        return false;
      }
      // Search term
      if (search) {
        const nameMatch = item.username?.toLowerCase().includes(search);
        const emailMatch = item.email?.toLowerCase().includes(search);
        const projMatch = item.projectTitle?.toLowerCase().includes(search);
        if (!nameMatch && !emailMatch && !projMatch) {
          return false;
        }
      }
      return true;
    });
  });

  // Actions
  inspectScorecard(assessment: DeveloperAssessment): void {
    this.inspectingAssessmentId.set(assessment.id);
    this.inspectingAssessment.set(assessment);
    this.showInspectorModal.set(true);
  }

  closeInspector(): void {
    this.showInspectorModal.set(false);
    this.inspectingAssessmentId.set(null);
    this.inspectingAssessment.set(null);
    this.loadData();
  }

  runAutoWorkflow(projectId: number): void {
    this.runningWorkflowProjectId.set(projectId);
    this.actionMessage.set(null);
    this.errorMessage.set(null);

    this.assessmentApi.runAutoWorkflow(projectId).subscribe({
      next: (res) => {
        this.runningWorkflowProjectId.set(null);
        this.actionMessage.set(`⚡ ${res.message}`);
        this.loadData();
      },
      error: (err) => {
        this.runningWorkflowProjectId.set(null);
        this.errorMessage.set(err?.error?.message || 'Auto-workflow failed.');
      }
    });
  }

  goToNewProject(): void {
    this.router.navigateByUrl(this.url.adminProjectNew);
  }
}
