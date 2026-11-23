import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import { AssessmentApiService } from '../../../core/api/assessment-api.service';
import {
  AssessmentQuestion,
  DeveloperAssessment,
  AssessmentFeedback,
  AssessmentExample
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
  readonly flaggedQuestions = signal<Record<string, boolean>>({});
  readonly saveStatus = signal<'saved' | 'saving'>('saved');
  readonly editorTab = signal<'code' | 'testcases'>('code');
  readonly isCopied = signal<boolean>(false);
  readonly codeLanguage = signal<string>('TypeScript');

  readonly showReviewModal = signal<boolean>(false);
  readonly showInstructionsModal = signal<boolean>(false);
  readonly instructionsTab = signal<'rules' | 'codeGuide' | 'rubric'>('rules');
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

  readonly flaggedCount = computed<number>(() => {
    const flags = this.flaggedQuestions();
    return this.questions().filter((q) => !!flags[q.qId]).length;
  });

  readonly currentCodeLines = computed<number[]>(() => {
    const q = this.currentQuestion();
    if (!q) return Array.from({ length: 18 }, (_, i) => i + 1);
    const code = this.answers()[q.qId] || '';
    const lineCount = code.split('\n').length;
    const total = Math.max(lineCount, 18);
    return Array.from({ length: total }, (_, i) => i + 1);
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
    const existing = { ...(assessment.answers || {}) };
    const qList = assessment.questions?.questions || [];
    for (const q of qList) {
      if (!existing[q.qId] || !existing[q.qId].trim()) {
        existing[q.qId] = this.getStarterCode(q);
      }
    }
    this.answers.set(existing);
  }

  getStarterCode(q: AssessmentQuestion | null): string {
    if (!q) return '';
    if (q.starterCode && q.starterCode.trim()) {
      return q.starterCode.trim();
    }
    const fnName = q.functionName || this.generateFunctionName(q.title);
    return `/**
 * @problem ${q.title}
 * @category ${q.category} (${q.difficulty || 'medium'})
 * @points ${q.maxPoints} pts
 */
export async function ${fnName}(input: any): Promise<any> {
  // 1. Input validation & boundary checks
  if (!input) {
    throw new Error('Invalid input parameter');
  }

  // 2. Implement your core logic here
  

  // 3. Return computed result
  return { success: true };
}
`;
  }

  generateFunctionName(title: string): string {
    const clean = (title || 'solution')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .filter(Boolean);
    if (clean.length === 0) return 'solution';
    return clean[0].toLowerCase() + clean.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  }

  setQuestionIndex(idx: number): void {
    if (idx >= 0 && idx < this.questions().length) {
      this.activeQuestionIndex.set(idx);
      this.editorTab.set('code');
    }
  }

  nextQuestion(): void {
    const nextIdx = this.activeQuestionIndex() + 1;
    if (nextIdx < this.questions().length) {
      this.setQuestionIndex(nextIdx);
    }
  }

  prevQuestion(): void {
    const prevIdx = this.activeQuestionIndex() - 1;
    if (prevIdx >= 0) {
      this.setQuestionIndex(prevIdx);
    }
  }

  updateAnswer(qId: string, value: string): void {
    const updated = { ...this.answers(), [qId]: value };
    this.answers.set(updated);
    this.saveStatus.set('saving');
    setTimeout(() => this.saveStatus.set('saved'), 350);
  }

  handleTabKey(event: KeyboardEvent, textarea: HTMLTextAreaElement): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const q = this.currentQuestion();
      if (!q) return;

      const current = this.answers()[q.qId] || '';
      const updated = current.substring(0, start) + '  ' + current.substring(end);
      this.updateAnswer(q.qId, updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }

  resetCurrentStarterCode(): void {
    const q = this.currentQuestion();
    if (!q) return;
    if (confirm('Reset editor to initial starter template? Your current edits for this question will be cleared.')) {
      this.updateAnswer(q.qId, this.getStarterCode(q));
    }
  }

  copyCurrentCode(): void {
    const q = this.currentQuestion();
    if (!q) return;
    const code = this.answers()[q.qId] || '';
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 1600);
      });
    }
  }

  insertSnippet(type: 'try-catch' | 'validation' | 'async-return'): void {
    const q = this.currentQuestion();
    if (!q) return;

    let snippet = '';
    if (type === 'try-catch') {
      snippet = `\n  try {\n    // Execute protected operation\n  } catch (error) {\n    throw new Error(\`Operation failed: \${error}\`);\n  }\n`;
    } else if (type === 'validation') {
      snippet = `\n  if (!input || typeof input !== 'object') {\n    throw new TypeError('Expected input argument to be an object');\n  }\n`;
    } else if (type === 'async-return') {
      snippet = `\n  return {\n    success: true,\n    processedCount: 1,\n    timestamp: new Date().toISOString()\n  };\n`;
    }

    const currentText = this.answers()[q.qId] || '';
    this.updateAnswer(q.qId, currentText + snippet);
  }

  getQuestionExamples(q: AssessmentQuestion | null): AssessmentExample[] {
    if (!q) return [];
    if (q.examples && q.examples.length > 0) {
      return q.examples;
    }
    const fn = q.functionName || this.generateFunctionName(q.title);
    return [
      {
        input: `${fn}({ id: "TX-4091", amount: 1500, currency: "USD" })`,
        output: `{ success: true, transactionId: "TX-4091", status: "VERIFIED" }`,
        explanation: 'Standard valid payload: validates parameters, completes business logic, and returns formatted result.'
      },
      {
        input: `${fn}(null)`,
        output: `throws Error("Invalid input parameter")`,
        explanation: 'Boundary case: null or malformed payload throws immediate clear validation exception.'
      }
    ];
  }

  getQuestionConstraints(q: AssessmentQuestion | null): string[] {
    if (!q) return [];
    if (q.constraints && q.constraints.length > 0) {
      return q.constraints;
    }
    return [
      'Type safety: Ensure all parameters and return types are strictly validated.',
      'Edge-case resilience: Gracefully handle null, undefined, empty strings, and arrays.',
      'Algorithmic performance: Strive for O(N) or better; avoid blocking synchronous calls in async routines.',
      'Error propagation: Throw clear error instances with descriptive messages on failures.'
    ];
  }

  submitAssessment(): void {
    const assessment = this.activeAssessment();
    if (!assessment) return;

    const unanswered = this.questions().length - this.answeredCount();
    if (unanswered > 0) {
      const confirmSubmit = confirm(
        `You have ${unanswered} question(s) with blank or unedited code. Are you sure you want to submit your assessment?`
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

  toggleFlag(qId: string): void {
    const current = this.flaggedQuestions();
    this.flaggedQuestions.set({
      ...current,
      [qId]: !current[qId]
    });
  }

  isFlagged(qId: string): boolean {
    return !!this.flaggedQuestions()[qId];
  }

  setEditorTab(tab: 'code' | 'testcases'): void {
    this.editorTab.set(tab);
  }

  openReviewModal(): void {
    this.showReviewModal.set(true);
  }

  closeReviewModal(): void {
    this.showReviewModal.set(false);
  }

  openInstructions(): void {
    this.showInstructionsModal.set(true);
  }

  closeInstructions(): void {
    this.showInstructionsModal.set(false);
  }

  setInstructionsTab(tab: 'rules' | 'codeGuide' | 'rubric'): void {
    this.instructionsTab.set(tab);
  }

  jumpToQuestion(idx: number): void {
    this.setQuestionIndex(idx);
    this.closeReviewModal();
  }

  printSummary(): void {
    window.print();
  }
}
