import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Project } from '../../../models/project.model';
import { ProjectStoreService } from '../../../services/project-store.service';
import { ROUTES, ROUTE_URL } from '../../../core/routing/route-paths';
import { ProjectCardComponent } from '../card/project-card';
import { ProjectFormComponent } from '../form/project-form';
import { ProjectFormValue } from '../../../core/forms';
import { projectDetailNav, projectEditNav } from '../shared/project-slug.util';
import { SearchFieldComponent } from '../../../shared/forms';

export type ProjectPortfolioLayout = 'admin' | 'manage' | 'browse';

@Component({
  selector: 'app-project-portfolio',
  standalone: true,
  imports: [CommonModule, RouterModule, ProjectCardComponent, SearchFieldComponent],
  templateUrl: './project-portfolio.html',
  styleUrls: ['./project-portfolio.css', '../shared/projects-ui.css']
})
export class ProjectPortfolioComponent {
  readonly layout = input<ProjectPortfolioLayout>('manage');
  readonly projects = input<Project[] | null>(null);
  protected readonly searchQuery = signal('');

  readonly projectSelected = output<Project>();

  protected readonly url = ROUTE_URL;

  private readonly projectStore = inject(ProjectStoreService);
  private readonly router = inject(Router);

  protected readonly storeProjects = this.projectStore.projects;
  protected readonly errorMessage = signal('');
  protected readonly editingProjectId = signal<number | null>(null);
  protected readonly editTitle = model('');
  protected readonly editDescription = model('');
  protected readonly draftImage = model<string | null>(null);
  protected readonly createDraftImage = model<string | null>(null);

  protected readonly displayProjects = computed(() => this.projects() ?? this.storeProjects());

  protected readonly filteredProjects = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.displayProjects();
    if (!query) return list;

    return list.filter((project) =>
      project.title.toLowerCase().includes(query) ||
      (project.description || '').toLowerCase().includes(query)
    );
  });

  constructor() {
    if (this.projectStore.projects().length === 0) {
      this.projectStore.refresh();
    }
  }

  protected openProjectDetail(project: Project): void {
    this.projectStore.setActiveProjectId(project.id);
    if (this.layout() === 'browse') {
      this.projectSelected.emit(project);
      return;
    }
    const isAdmin = this.layout() === 'admin' || this.router.url.startsWith('/admin');
    this.router.navigate(projectDetailNav(project, this.projectStore.projects(), isAdmin));
  }

  protected openProjectEdit(project: Project): void {
    this.projectStore.setActiveProjectId(project.id);
    const isAdmin = this.layout() === 'admin' || this.router.url.startsWith('/admin');
    this.router.navigate(projectEditNav(project, this.projectStore.projects(), isAdmin));
  }

  protected startEdit(project: Project): void {
    this.editingProjectId.set(project.id);
    this.editTitle.set(project.title);
    this.editDescription.set(project.description || '');
    this.draftImage.set(project.imagePath || null);
  }

  protected cancelEdit(): void {
    this.editingProjectId.set(null);
    this.editTitle.set('');
    this.editDescription.set('');
    this.draftImage.set(null);
  }

  protected createProject(value: ProjectFormValue): void {
    this.projectStore.add({
      title: value.title,
      description: value.description,
      imagePath: this.createDraftImage() || null
    });

    this.createDraftImage.set(null);
    this.errorMessage.set('');
  }

  protected updateProject(projectId: number, value: ProjectFormValue): void {
    this.projectStore.update(projectId, {
      title: value.title,
      description: value.description,
      imagePath: this.draftImage() || null
    });
    this.cancelEdit();
  }

  protected deleteProject(project: Project): void {
    this.projectStore.remove(project.id);
  }
}
