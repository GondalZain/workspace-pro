import { Component, computed, effect, inject, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceUserLayoutComponent } from '../../../components/workspace-user-layout/workspace-user-layout';
import {
  ProjectFormComponent,
  ProjectFormValue,
  ProjectPageChromeComponent,
  findProjectBySlug,
  projectDetailNav,
  projectSlug
} from '../../../components/projects';
import { ProjectStoreService } from '../../../services/project-store.service';
import { Project } from '../../../models/project.model';
import { ROUTES } from '../../../core/routing/route-paths';

@Component({
  selector: 'app-user-project-edit-page',
  standalone: true,
  imports: [CommonModule, WorkspaceUserLayoutComponent, ProjectPageChromeComponent, ProjectFormComponent],
  templateUrl: './edit-project.page.html',
  styleUrl: './edit-project.page.css'
})
export class UserProjectEditPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectStore = inject(ProjectStoreService);

  private readonly routeSlug = signal<string | null>(null);
  private syncedProjectId: number | null = null;

  protected readonly title = model('');
  protected readonly description = model('');
  protected readonly imagePreview = model<string | null>(null);
  protected readonly defaultAssigneeId = model<number | null>(null);
  protected readonly formTemplateId = model<number | null>(null);
  protected readonly customFields = model<Record<string, any>>({});
  protected readonly errorMessage = signal('');
  protected readonly isAdminRoute = computed(() => this.router.url.startsWith('/admin'));

  protected readonly project = computed<Project | null>(() =>
    findProjectBySlug(this.projectStore.projects(), this.routeSlug())
  );

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.routeSlug.set(params.get('slug'));
    });

    effect(() => {
      const currentProject = this.project();
      this.projectStore.setActiveProjectId(currentProject?.id ?? null);

      const slug = this.routeSlug();
      const list = this.projectStore.projects();
      if (!currentProject || !slug) return;

      const canonical = projectSlug(currentProject, list);
      if (slug !== canonical) {
        const routeFn = this.isAdminRoute() ? ROUTES.adminProjectEdit : ROUTES.projectEdit;
        this.router.navigate(routeFn(canonical), { replaceUrl: true });
      }
    });

    if (this.projectStore.projects().length === 0) {
      this.projectStore.refresh();
    }

    effect(() => {
      const currentProject = this.project();
      if (!currentProject) {
        this.syncedProjectId = null;
        return;
      }

      this.title.set(currentProject.title ?? '');
      this.description.set(currentProject.description ?? '');
      this.defaultAssigneeId.set(currentProject.defaultAssigneeId ?? null);
      this.formTemplateId.set(currentProject.formTemplateId ?? null);
      this.customFields.set(currentProject.customFields ?? {});

      if (this.syncedProjectId !== currentProject.id) {
        this.syncedProjectId = currentProject.id;
        this.imagePreview.set(currentProject.imagePath ?? null);
      }
    });
  }

  protected saveProject(value: ProjectFormValue): void {
    const currentProject = this.project();
    if (!currentProject) {
      this.errorMessage.set('Project title is required.');
      return;
    }

    this.errorMessage.set('');
    this.projectStore.update(currentProject.id, {
      title: value.title,
      description: value.description,
      imagePath: this.imagePreview() || null,
      defaultAssigneeId: value.defaultAssigneeId,
      formTemplateId: value.formTemplateId,
      customFields: value.customFields || {}
    });

    const updated: Project = {
      ...currentProject,
      title: value.title,
      defaultAssigneeId: value.defaultAssigneeId,
      formTemplateId: value.formTemplateId,
      customFields: value.customFields || {}
    };
    this.router.navigate(projectDetailNav(updated, this.projectStore.projects(), this.isAdminRoute()));
  }

  protected goBack(): void {
    const currentProject = this.project();
    if (currentProject) {
      this.router.navigate(projectDetailNav(currentProject, this.projectStore.projects(), this.isAdminRoute()));
      return;
    }

    if (this.isAdminRoute()) {
      this.router.navigate(ROUTES.adminProjects);
    } else {
      this.router.navigate(ROUTES.dashboardProjects);
    }
  }
}
