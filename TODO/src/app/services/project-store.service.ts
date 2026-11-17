import { Injectable, inject, signal } from '@angular/core';
import { NewProject, Project } from '../models/project.model';
import { ProjectApiService } from '../core/api/project-api.service';

@Injectable({ providedIn: 'root' })
export class ProjectStoreService {
  private readonly api = inject(ProjectApiService);
  readonly projects = signal<Project[]>([]);
  readonly activeProjectId = signal<number | null>(null);

  setActiveProjectId(projectId: number | null): void {
    this.activeProjectId.set(projectId);
  }

  refresh(): void {
    this.api.list().subscribe({
      next: (projects) => this.projects.set(projects),
      error: (error) => console.error('Could not load projects.', error)
    });
  }

  add(project: NewProject, onCreated?: (project: Project) => void): void {
    this.api.create(project).subscribe({
      next: (createdProject) => {
        this.projects.update((items) => [createdProject, ...items]);
        onCreated?.(createdProject);
      },
      error: (error) => console.error('Could not create project.', error)
    });
  }

  update(projectId: number, project: NewProject): void {
    this.api.update(projectId, project).subscribe({
      next: (updatedProject) => {
        this.projects.update((items) => items.map((item) => item.id === projectId ? updatedProject : item));
      },
      error: (error) => console.error('Could not update project.', error)
    });
  }

  remove(projectId: number): void {
    this.api.delete(projectId).subscribe({
      next: () => {
        this.projects.update((items) => items.filter((item) => item.id !== projectId));
      },
      error: (error) => console.error('Could not delete project.', error)
    });
  }
}
