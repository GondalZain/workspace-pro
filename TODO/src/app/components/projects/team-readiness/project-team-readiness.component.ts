import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssessmentApiService } from '../../../core/api/assessment-api.service';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { User } from '../../../core/auth/auth.service';
import {
  ProjectMember,
  SmartMatchingResult,
  SmartTaskAssignment,
  DeveloperAssessment
} from '../../../models/assessment.model';
import { Project } from '../../../models/project.model';
import { DeveloperTestRunnerComponent } from '../../assessments/test-runner/developer-test-runner.component';

@Component({
  selector: 'app-project-team-readiness',
  standalone: true,
  imports: [CommonModule, FormsModule, DeveloperTestRunnerComponent],
  templateUrl: './project-team-readiness.component.html',
  styleUrls: ['./project-team-readiness.component.css']
})
export class ProjectTeamReadinessComponent {
  readonly project = input<Project | null>(null);
  readonly isAdmin = input<boolean>(false);
  readonly projectUpdated = output<void>();

  private readonly assessmentApi = inject(AssessmentApiService);
  private readonly adminApi = inject(AdminApiService);

  protected readonly loading = signal<boolean>(false);
  protected readonly generatingTests = signal<boolean>(false);
  protected readonly matchingTasks = signal<boolean>(false);
  protected readonly startingProject = signal<boolean>(false);
  protected readonly feedbackMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly members = signal<ProjectMember[]>([]);
  protected readonly availableUsers = signal<User[]>([]);
  protected readonly selectedUserIds = signal<number[]>([]);
  protected readonly smartMatchResult = signal<SmartMatchingResult | null>(null);

  // Inspector modal for admin to view a member's test result
  protected readonly inspectingAssessmentId = signal<number | null>(null);
  protected readonly showInspectionModal = signal<boolean>(false);

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(): void {
    if (this.project()?.id) {
      this.loadProjectMembers();
    }
  }

  private loadData(): void {
    if (this.isAdmin()) {
      this.adminApi.listUsers().subscribe({
        next: (users) => this.availableUsers.set(users),
        error: () => {}
      });
    }
    this.loadProjectMembers();
  }

  loadProjectMembers(): void {
    const proj = this.project();
    if (!proj?.id) return;

    this.loading.set(true);
    this.assessmentApi.getProjectMembers(proj.id).subscribe({
      next: (mems) => {
        this.loading.set(false);
        this.members.set(mems);
        this.selectedUserIds.set(mems.map((m) => m.userId));
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to load project team members.');
      }
    });
  }

  // Developer roster selection
  toggleUserSelection(userId: number): void {
    this.selectedUserIds.update((curr) => {
      if (curr.includes(userId)) {
        return curr.filter((id) => id !== userId);
      } else {
        return [...curr, userId];
      }
    });
  }

  saveMembersRoster(): void {
    const proj = this.project();
    if (!proj?.id) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.feedbackMessage.set(null);

    this.assessmentApi.setProjectMembers(proj.id, this.selectedUserIds()).subscribe({
      next: (mems) => {
        this.loading.set(false);
        this.members.set(mems);
        this.feedbackMessage.set('Project developer team updated successfully.');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to update project team.');
      }
    });
  }

  // Generate Gemini Technical Assessments
  generateAssessments(): void {
    const proj = this.project();
    if (!proj?.id) return;

    if (this.members().length === 0) {
      this.errorMessage.set('Please select and save developers into the project team first.');
      return;
    }

    this.generatingTests.set(true);
    this.errorMessage.set(null);
    this.feedbackMessage.set(null);

    this.assessmentApi.generateAssessments(proj.id, this.selectedUserIds()).subscribe({
      next: (res) => {
        this.generatingTests.set(false);
        this.feedbackMessage.set(`✨ ${res.message}`);
        this.loadProjectMembers();
      },
      error: (err) => {
        this.generatingTests.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to generate AI assessments.');
      }
    });
  }

  // Inspect assessment
  inspectAssessment(assessmentId: number): void {
    this.inspectingAssessmentId.set(assessmentId);
    this.showInspectionModal.set(true);
  }

  closeInspectionModal(): void {
    this.showInspectionModal.set(false);
    this.inspectingAssessmentId.set(null);
    this.loadProjectMembers();
  }

  // Run AI Smart Task Allocation
  runSmartTaskMatching(): void {
    const proj = this.project();
    if (!proj?.id) return;

    this.matchingTasks.set(true);
    this.errorMessage.set(null);
    this.feedbackMessage.set(null);

    this.assessmentApi.smartMatchTasks(proj.id).subscribe({
      next: (res) => {
        this.matchingTasks.set(false);
        this.smartMatchResult.set(res);
        this.feedbackMessage.set('AI task matching completed based on evaluated skills and 6.0 hrs/day capacity.');
      },
      error: (err) => {
        this.matchingTasks.set(false);
        this.errorMessage.set(err?.error?.message || 'Smart task allocation failed.');
      }
    });
  }

  applySmartAssignments(): void {
    const proj = this.project();
    const result = this.smartMatchResult();
    if (!proj?.id || !result?.assignments?.length) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.assessmentApi.applyTaskAssignments(proj.id, result.assignments).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.feedbackMessage.set(`✅ ${res.message}`);
        this.smartMatchResult.set(null);
        this.projectUpdated.emit();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to apply assignments.');
      }
    });
  }

  // Start / Kick off project
  startProject(): void {
    const proj = this.project();
    if (!proj?.id) return;

    const unevaluated = this.members().filter((m) => m.readinessStatus !== 'evaluated');
    if (unevaluated.length > 0) {
      const confirmStart = confirm(
        `Notice: ${unevaluated.length} developer(s) have not completed their AI technical assessment yet. Do you want to start the project anyway?`
      );
      if (!confirmStart) return;
    }

    this.startingProject.set(true);
    this.errorMessage.set(null);

    this.assessmentApi.startProject(proj.id).subscribe({
      next: (res) => {
        this.startingProject.set(false);
        this.feedbackMessage.set(`🚀 ${res.message}`);
        this.projectUpdated.emit();
      },
      error: (err) => {
        this.startingProject.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to start project.');
      }
    });
  }

  protected readonly allAssessed = computed(() => {
    const mems = this.members();
    return mems.length > 0 && mems.every((m) => m.readinessStatus === 'evaluated');
  });

  protected readonly avgTeamScore = computed(() => {
    const evaluated = this.members().filter((m) => m.score !== null && m.score !== undefined);
    if (evaluated.length === 0) return 0;
    const total = evaluated.reduce((sum, m) => sum + (m.score || 0), 0);
    return Math.round(total / evaluated.length);
  });
}
