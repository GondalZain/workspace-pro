import { Component, computed, inject, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import {
  ProjectFormComponent,
  ProjectFormValue,
  ProjectPageChromeComponent
} from '../../../components/projects';
import { AiSrsTaskGeneratorModalComponent } from '../../../components/projects/ai-srs-generator/ai-srs-generator';
import { ProjectStoreService } from '../../../services/project-store.service';
import { ROUTES } from '../../../core/routing/route-paths';
import { projectDetailNav } from '../../../components/projects/shared/project-slug.util';

@Component({
  selector: 'app-user-project-create-page',
  standalone: true,
  imports: [
    CommonModule,
    WorkspaceUserLayoutComponent,
    ProjectPageChromeComponent,
    ProjectFormComponent,
    AiSrsTaskGeneratorModalComponent
  ],
  templateUrl: './new-project.page.html',
  styleUrl: './new-project.page.css'
})
export class UserProjectCreatePage {
  private readonly projectStore = inject(ProjectStoreService);
  private readonly router = inject(Router);

  protected readonly creationMode = signal<'manual' | 'ai'>('manual');
  protected readonly imagePreview = model<string | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly isAdminRoute = computed(() => this.router.url.startsWith('/admin'));

  protected createProject(value: ProjectFormValue): void {
    this.errorMessage.set('');
    this.projectStore.add({
      title: value.title,
      description: value.description,
      imagePath: this.imagePreview() || null,
      defaultAssigneeId: value.defaultAssigneeId,
      formTemplateId: value.formTemplateId,
      customFields: value.customFields || {}
    }, () => {
      if (this.isAdminRoute()) {
        this.router.navigate(ROUTES.adminProjects);
      } else {
        this.router.navigate(ROUTES.dashboardProjects);
      }
    });
  }

  protected onAiProjectCreated(event: { project: any; tasksCount: number }): void {
    const allProjects = this.projectStore.projects();
    const navSegments = projectDetailNav(event.project, allProjects, this.isAdminRoute());
    this.router.navigate(navSegments);
  }

  protected goBack(): void {
    if (this.isAdminRoute()) {
      this.router.navigate(ROUTES.adminProjects);
    } else {
      this.router.navigate(ROUTES.dashboardProjects);
    }
  }
}
