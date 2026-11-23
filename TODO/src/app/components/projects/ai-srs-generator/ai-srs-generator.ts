import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectApiService } from '../../../core/api/project-api.service';
import { AiSrsAnalysisResult, AiSrsModuleDraft, AiSrsTaskDraft } from '../../../models/task.model';
import { TaskStoreService } from '../../../services/task-store.service';
import { ProjectStoreService } from '../../../services/project-store.service';

type StepMode = 'input' | 'analyzing' | 'review';

@Component({
  selector: 'app-ai-srs-generator-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-srs-generator.html',
  styleUrl: './ai-srs-generator.css'
})
export class AiSrsTaskGeneratorModalComponent {
  readonly projectId = input<number | null>(null);
  readonly projectTitle = input<string>('Project');
  readonly inline = input<boolean>(false);
  readonly mode = input<'new-project' | 'existing-project'>('existing-project');
  readonly isOpen = model<boolean>(true);
  readonly tasksGenerated = output<{ count: number }>();
  readonly projectCreated = output<{ project: any; tasksCount: number }>();
  readonly cancelled = output<void>();

  private readonly projectApi = inject(ProjectApiService);
  private readonly taskStore = inject(TaskStoreService);
  private readonly projectStore = inject(ProjectStoreService);

  protected readonly currentStep = signal<StepMode>('input');
  protected readonly inputTab = signal<'file' | 'text'>('file');

  // Input states
  protected readonly customProjectTitle = signal<string>('');
  protected readonly customProjectDescription = signal<string>('');
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly pastedText = signal<string>('');
  protected readonly isDraggingOver = signal<boolean>(false);

  // Analysis result
  protected readonly analysisResult = signal<AiSrsAnalysisResult | null>(null);
  protected readonly reviewModules = signal<AiSrsModuleDraft[]>([]);

  // UI state
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');
  protected readonly expandedModules = signal<Record<number, boolean>>({});

  // Summary computed
  protected readonly selectedTasksCount = computed(() => {
    let count = 0;
    for (const mod of this.reviewModules()) {
      for (const t of mod.tasks) {
        if (t.selected !== false) count++;
      }
    }
    return count;
  });

  protected readonly totalEstimatedHours = computed(() => {
    let totalMins = 0;
    for (const mod of this.reviewModules()) {
      for (const t of mod.tasks) {
        if (t.selected !== false) {
          totalMins += Number(t.estimatedMinutes) || 0;
        }
      }
    }
    return (totalMins / 60).toFixed(1);
  });

  protected readonly totalDependenciesCount = computed(() => {
    let count = 0;
    for (const mod of this.reviewModules()) {
      for (const t of mod.tasks) {
        if (t.selected !== false && Array.isArray(t.dependsOnTempIds)) {
          count += t.dependsOnTempIds.length;
        }
      }
    }
    return count;
  });

  protected closeModal(): void {
    if (this.isSubmitting()) return;
    this.cancelled.emit();
    this.isOpen.set(false);
    this.resetState();
  }

  protected resetState(): void {
    this.currentStep.set('input');
    this.selectedFile.set(null);
    this.pastedText.set('');
    this.analysisResult.set(null);
    this.reviewModules.set([]);
    this.errorMessage.set('');
    this.isSubmitting.set(false);
    this.expandedModules.set({});
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(true);
  }

  protected onDragLeave(): void {
    this.isDraggingOver.set(false);
  }

  protected onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  protected onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      this.handleFile(inputEl.files[0]);
    }
  }

  private handleFile(file: File): void {
    const validExtensions = ['.pdf', '.txt', '.md', '.docx', '.json', '.csv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt && !file.type.includes('pdf') && !file.type.includes('text')) {
      this.errorMessage.set('Please select an SRS document (.pdf, .docx, .txt, .md).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      this.errorMessage.set('Document exceeds the maximum 25 MB limit.');
      return;
    }
    this.errorMessage.set('');
    this.selectedFile.set(file);
  }

  protected startAnalysis(): void {
    const file = this.selectedFile();
    const text = this.pastedText().trim();

    if (this.inputTab() === 'file' && !file) {
      this.errorMessage.set('Please choose or drop an SRS document file.');
      return;
    }
    if (this.inputTab() === 'text' && (!text || text.length < 20)) {
      this.errorMessage.set('Please enter or paste at least 20 characters of requirements.');
      return;
    }

    this.errorMessage.set('');
    this.currentStep.set('analyzing');

    const handleSuccess = (result: AiSrsAnalysisResult) => {
      this.analysisResult.set(result);
      if (this.mode() === 'new-project') {
        if (result.projectTitle && !this.customProjectTitle().trim()) {
          this.customProjectTitle.set(result.projectTitle);
        }
        if (result.projectDescription && !this.customProjectDescription().trim()) {
          this.customProjectDescription.set(result.projectDescription);
        }
      }

      const modulesWithSelection = (result.modules || []).map((m) => ({
        ...m,
        tasks: (m.tasks || []).map((t) => ({ ...t, selected: true }))
      }));
      this.reviewModules.set(modulesWithSelection);

      // Expand first 2 modules by default
      const initialExpanded: Record<number, boolean> = {};
      modulesWithSelection.forEach((_, idx) => {
        initialExpanded[idx] = idx < 2;
      });
      this.expandedModules.set(initialExpanded);

      this.currentStep.set('review');
    };

    const handleError = (err: any) => {
      console.error('SRS Analysis failed:', err);
      this.currentStep.set('input');
      this.errorMessage.set(
        err.error?.error ||
        err.message ||
        'Failed to analyze SRS document. Please verify your GEMINI_API_KEY in backend/.env.'
      );
    };

    if (this.mode() === 'new-project') {
      this.projectApi.analyzeSrsDraft({
        file: this.inputTab() === 'file' ? file : null,
        rawText: this.inputTab() === 'text' ? text : null,
        projectTitle: this.customProjectTitle().trim() || undefined
      }).subscribe({
        next: handleSuccess,
        error: handleError
      });
    } else {
      const pId = this.projectId();
      if (!pId) {
        this.currentStep.set('input');
        this.errorMessage.set('Project ID is required.');
        return;
      }
      this.projectApi.analyzeSrs(pId, {
        file: this.inputTab() === 'file' ? file : null,
        rawText: this.inputTab() === 'text' ? text : null
      }).subscribe({
        next: handleSuccess,
        error: handleError
      });
    }
  }

  protected toggleModuleAccordion(index: number): void {
    this.expandedModules.update((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  }

  protected toggleModuleSelectAll(moduleIndex: number, select: boolean): void {
    this.reviewModules.update((modules) => {
      const copy = [...modules];
      if (copy[moduleIndex]) {
        copy[moduleIndex] = {
          ...copy[moduleIndex],
          tasks: copy[moduleIndex].tasks.map((t) => ({ ...t, selected: select }))
        };
      }
      return copy;
    });
  }

  protected commitApprovedTasks(): void {
    if (this.isSubmitting() || this.selectedTasksCount() === 0) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    // Filter only selected tasks
    const approvedModules: AiSrsModuleDraft[] = this.reviewModules()
      .map((mod) => ({
        ...mod,
        tasks: mod.tasks.filter((t) => t.selected !== false)
      }))
      .filter((mod) => mod.tasks.length > 0);

    if (this.mode() === 'new-project') {
      const finalTitle = this.customProjectTitle().trim() || this.analysisResult()?.projectTitle || 'AI Generated Project';
      const finalDesc = this.customProjectDescription().trim() || this.analysisResult()?.projectDescription || this.analysisResult()?.summary || '';

      this.projectApi.createWithAiTasks({
        title: finalTitle,
        description: finalDesc,
        modules: approvedModules
      }).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.projectStore.refresh();
          this.taskStore.refresh();
          this.projectCreated.emit({ project: res.project, tasksCount: res.createdTasksCount });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          console.error('Failed to create AI project & tasks:', err);
          this.errorMessage.set(err.error?.error || 'Failed to create project and tasks.');
        }
      });
    } else {
      const pId = this.projectId();
      if (!pId) return;

      this.projectApi.commitAiTasks(pId, approvedModules).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.taskStore.refresh();
          this.tasksGenerated.emit({ count: res.createdTasksCount });
          this.closeModal();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          console.error('Failed to commit AI tasks:', err);
          this.errorMessage.set(err.error?.error || 'Failed to save generated tasks to the database.');
        }
      });
    }
  }

  protected getTaskTitleByTempId(tempId: string): string {
    for (const mod of this.reviewModules()) {
      const found = mod.tasks.find((t) => t.tempId === tempId);
      if (found) return found.title;
    }
    return tempId;
  }
}
