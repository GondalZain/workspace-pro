import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssessmentApiService } from '../../../core/api/assessment-api.service';
import {
  AssessmentQuestion,
  AssessmentFeedback,
  DeveloperAssessment
} from '../../../models/assessment.model';

@Component({
  selector: 'app-developer-test-runner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './developer-test-runner.component.html',
  styleUrls: ['./developer-test-runner.component.css']
})
export class DeveloperTestRunnerComponent {
  readonly assessmentId = input<number | null>(null);
  readonly initialAssessment = input<DeveloperAssessment | null>(null);
  readonly isOpen = input<boolean>(false);

  readonly close = output<void>();
  readonly completed = output<DeveloperAssessment>();

  private readonly assessmentApi = inject(AssessmentApiService);

  protected readonly loading = signal<boolean>(false);
  protected readonly evaluating = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly assessment = signal<DeveloperAssessment | null>(null);
  protected readonly activeIndex = signal<number>(0);
  protected readonly userAnswers = signal<Record<string, string>>({});
  protected readonly showResults = signal<boolean>(false);
  protected readonly evaluationResult = signal<AssessmentFeedback | null>(null);

  // Auto-init on changes
  constructor() {
    // Whenever input changes or opens, initialize
  }

  ngOnChanges(): void {
    if (this.isOpen()) {
      if (this.initialAssessment()) {
        this.loadFromAssessment(this.initialAssessment()!);
      } else if (this.assessmentId()) {
        this.fetchAssessment(this.assessmentId()!);
      }
    }
  }

  fetchAssessment(id: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.assessmentApi.getAssessmentById(id).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.loadFromAssessment(data);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.message || 'Could not load assessment details.');
      }
    });
  }

  private loadFromAssessment(data: DeveloperAssessment): void {
    this.assessment.set(data);
    this.userAnswers.set(data.answers ? { ...data.answers } : {});
    this.activeIndex.set(0);

    if (data.status === 'evaluated' && data.feedback) {
      this.showResults.set(true);
      this.evaluationResult.set(data.feedback);
    } else {
      this.showResults.set(false);
    }
  }

  protected readonly questions = computed<AssessmentQuestion[]>(() => {
    return this.assessment()?.questions?.questions || [];
  });

  protected readonly currentQuestion = computed<AssessmentQuestion | null>(() => {
    const list = this.questions();
    const idx = this.activeIndex();
    return list[idx] || null;
  });

  protected readonly totalQuestions = computed<number>(() => this.questions().length);

  protected readonly answeredCount = computed<number>(() => {
    const answers = this.userAnswers();
    const list = this.questions();
    return list.filter((q) => !!answers[q.qId]?.trim()).length;
  });

  protected readonly progressPercent = computed<number>(() => {
    const total = this.totalQuestions();
    if (total === 0) return 0;
    return Math.round((this.answeredCount() / total) * 100);
  });

  setQuestionIndex(idx: number): void {
    if (idx >= 0 && idx < this.totalQuestions()) {
      this.activeIndex.set(idx);
    }
  }

  nextQuestion(): void {
    if (this.activeIndex() < this.totalQuestions() - 1) {
      this.activeIndex.update((i) => i + 1);
    }
  }

  prevQuestion(): void {
    if (this.activeIndex() > 0) {
      this.activeIndex.update((i) => i - 1);
    }
  }

  onAnswerChange(qId: string, val: string): void {
    this.userAnswers.update((prev) => ({
      ...prev,
      [qId]: val
    }));
  }

  submitForAiEvaluation(): void {
    const current = this.assessment();
    if (!current) return;

    if (this.answeredCount() === 0) {
      if (!confirm('You have not entered answers for any question. Do you still want to submit?')) {
        return;
      }
    }

    this.evaluating.set(true);
    this.errorMessage.set(null);

    this.assessmentApi.submitAssessment(current.id, this.userAnswers()).subscribe({
      next: (res) => {
        this.evaluating.set(false);
        this.showResults.set(true);
        this.evaluationResult.set(res.feedback);

        const updated: DeveloperAssessment = {
          ...current,
          status: 'evaluated',
          score: res.score,
          evaluatedLevel: res.evaluatedLevel as any,
          maxComplexity: res.maxComplexity as any,
          feedback: res.feedback,
          completedAt: new Date().toISOString()
        };
        this.assessment.set(updated);
        this.completed.emit(updated);
      },
      error: (err) => {
        this.evaluating.set(false);
        this.errorMessage.set(err?.error?.message || 'Gemini evaluation failed. Please try again.');
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
