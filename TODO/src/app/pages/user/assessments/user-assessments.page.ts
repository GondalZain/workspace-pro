import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import { AssessmentApiService } from '../../../core/api/assessment-api.service';
import {
  AssessmentQuestion,
  DeveloperAssessment,
  AssessmentFeedback
} from '../../../models/assessment.model';

@Component({
  selector: 'app-user-assessments-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, WorkspaceUserLayoutComponent],
  templateUrl: './user-assessments.page.html',
  styleUrl: './user-assessments.page.css'
})
export class UserAssessmentsPage implements OnInit {
  private readonly assessmentApi = inject(AssessmentApiService);
  private readonly route = inject(ActivatedRoute);

  // Data signals
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly allAssessments = signal<DeveloperAssessment[]>([]);
  readonly activeAssessment = signal<DeveloperAssessment | null>(null);

  // Active test runner state
  readonly activeQuestionIndex = signal<number>(0);
  readonly answers = signal<Record<string, string>>({});
  readonly saveStatus = signal<'saved' | 'saving'>('saved');
  readonly expandedQuestions = signal<Record<string, boolean>>({});

  // Computed state
  readonly pendingAssessments = computed(() =>
    this.allAssessments().filter((a) => a.status === 'pending' || a.status === 'in_progress')
  );

  readonly completedAssessments = computed(() =>
    this.allAssessments().filter((a) => a.status === 'completed' || a.status === 'evaluated')
  );

  readonly questions = computed<AssessmentQuestion[]>(() => {
    return this.activeAssessment()?.questions?.questions || [];
  });

  readonly currentQuestion = computed<AssessmentQuestion | null>(() => {
    const list = this.questions();
    const idx = this.activeQuestionIndex();
    return list[idx] || null;
  });

  readonly answeredCount = computed<number>(() => {
    const ans = this.answers();
    return this.questions().filter((q) => !!ans[q.qId]?.trim()).length;
  });

  readonly progressPercentage = computed<number>(() => {
    const total = this.questions().length;
    if (total === 0) return 0;
    return Math.round((this.answeredCount() / total) * 100);
  });

  readonly activeFeedback = computed<AssessmentFeedback | null>(() => {
    return this.activeAssessment()?.feedback || null;
  });

  ngOnInit(): void {
    this.loadAssessments();
  }

  loadAssessments(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.assessmentApi.getMyAllAssessments().subscribe({
      next: (list) => {
        this.allAssessments.set(list || []);
        this.isLoading.set(false);

        // Check query param for specific ID
        const targetId = this.route.snapshot.queryParamMap.get('id');
        if (targetId) {
          const match = list.find((a) => a.id === Number(targetId));
          if (match) {
            this.selectAssessment(match);
            return;
          }
        }

        // Auto-select first pending or first in list
        const firstPending = list.find((a) => a.status === 'pending' || a.status === 'in_progress');
        if (firstPending) {
          this.selectAssessment(firstPending);
        } else if (list.length > 0) {
          this.selectAssessment(list[0]);
        }
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to load assessments.');
        this.isLoading.set(false);
      }
    });
  }

  selectAssessment(assessment: DeveloperAssessment): void {
    // If not fully populated with questions and feedback, fetch full details
    if (!assessment.questions) {
      this.assessmentApi.getAssessmentById(assessment.id).subscribe({
        next: (full) => {
          this.activeAssessment.set(full);
          this.initAnswers(full);
        },
        error: () => {
          this.activeAssessment.set(assessment);
          this.initAnswers(assessment);
        }
      });
    } else {
      this.activeAssessment.set(assessment);
      this.initAnswers(assessment);
    }
  }

  private initAnswers(assessment: DeveloperAssessment): void {
    this.activeQuestionIndex.set(0);
    const existing = assessment.answers || {};
    this.answers.set({ ...existing });
  }

  setQuestionIndex(idx: number): void {
    if (idx >= 0 && idx < this.questions().length) {
      this.activeQuestionIndex.set(idx);
    }
  }

  nextQuestion(): void {
    const nextIdx = this.activeQuestionIndex() + 1;
    if (nextIdx < this.questions().length) {
      this.activeQuestionIndex.set(nextIdx);
    }
  }

  prevQuestion(): void {
    const prevIdx = this.activeQuestionIndex() - 1;
    if (prevIdx >= 0) {
      this.activeQuestionIndex.set(prevIdx);
    }
  }

  updateAnswer(qId: string, value: string): void {
    const updated = { ...this.answers(), [qId]: value };
    this.answers.set(updated);
    this.saveStatus.set('saving');
    setTimeout(() => this.saveStatus.set('saved'), 400);
  }

  insertSnippet(type: 'code' | 'architecture' | 'tradeoffs'): void {
    const q = this.currentQuestion();
    if (!q) return;

    let snippet = '';
    if (type === 'code') {
      snippet = `\n\`\`\`typescript\n// Implementation approach\nfunction handleWorkflow() {\n  // Logic here\n}\n\`\`\`\n`;
    } else if (type === 'architecture') {
      snippet = `\n### Architecture & Strategy:\n1. Core Components:\n2. Data Flow & State Management:\n3. Concurrency Handling:\n`;
    } else if (type === 'tradeoffs') {
      snippet = `\n### Trade-offs & Edge Cases:\n- Pros & Performance benefits:\n- Potential failure modes & mitigations:\n- Scalability limits:\n`;
    }

    const currentText = this.answers()[q.qId] || '';
    this.updateAnswer(q.qId, currentText + snippet);
  }

  submitAssessment(): void {
    const assessment = this.activeAssessment();
    if (!assessment) return;

    const unanswered = this.questions().length - this.answeredCount();
    if (unanswered > 0) {
      const confirmSubmit = confirm(
        `You have ${unanswered} unanswered question(s). Are you sure you want to submit for Gemini AI evaluation?`
      );
      if (!confirmSubmit) return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.assessmentApi.submitAssessment(assessment.id, this.answers()).subscribe({
      next: (_res) => {
        // Refresh to fetch evaluated results
        this.assessmentApi.getAssessmentById(assessment.id).subscribe({
          next: (evaluated) => {
            this.activeAssessment.set(evaluated);
            this.isSubmitting.set(false);
            // Update in allAssessments list
            const currentList = this.allAssessments().map((a) =>
              a.id === evaluated.id ? evaluated : a
            );
            this.allAssessments.set(currentList);
          },
          error: () => {
            this.isSubmitting.set(false);
            this.loadAssessments();
          }
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to submit assessment.');
      }
    });
  }

  toggleCritique(qId: string): void {
    const current = this.expandedQuestions();
    this.expandedQuestions.set({
      ...current,
      [qId]: !current[qId]
    });
  }

  isCritiqueExpanded(qId: string): boolean {
    return !!this.expandedQuestions()[qId];
  }

  getScoreColorClass(score: number | null | undefined): string {
    if (score == null) return 'badge-neutral';
    if (score >= 80) return 'badge-success';
    if (score >= 60) return 'badge-warning';
    return 'badge-danger';
  }

  getComplexityBadgeClass(level: string | null | undefined): string {
    if (!level) return 'badge-neutral';
    if (level === 'high') return 'badge-purple';
    if (level === 'medium') return 'badge-blue';
    return 'badge-teal';
  }
}
