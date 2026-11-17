import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { NewProject, Project } from '../../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  private readonly http = inject(HttpClient);
  private readonly projectsUrl = `${API_BASE_URL}/projects`;

  list() {
    return this.http.get<Project[]>(this.projectsUrl);
  }

  create(project: NewProject) {
    return this.http.post<Project>(this.projectsUrl, project);
  }

  update(projectId: number, project: NewProject) {
    return this.http.put<Project>(`${this.projectsUrl}/${projectId}`, project);
  }

  delete(projectId: number) {
    return this.http.delete<void>(`${this.projectsUrl}/${projectId}`);
  }
}
