import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { NewProject, Project } from '../../models/project.model';
import { AiSrsAnalysisResult, AiSrsModuleDraft } from '../../models/task.model';

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

  analyzeSrs(projectId: number, payload: { file?: File | null; rawText?: string | null }) {
    if (payload.file) {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.rawText) formData.append('rawText', payload.rawText);
      return this.http.post<AiSrsAnalysisResult>(`${this.projectsUrl}/${projectId}/ai/srs-analyze`, formData);
    }
    return this.http.post<AiSrsAnalysisResult>(`${this.projectsUrl}/${projectId}/ai/srs-analyze`, {
      rawText: payload.rawText || ''
    });
  }

  commitAiTasks(projectId: number, modules: AiSrsModuleDraft[]) {
    return this.http.post<{ createdTasksCount: number; insertedDependenciesCount: number; tasks: any[] }>(
      `${this.projectsUrl}/${projectId}/ai/commit-tasks`,
      { modules }
    );
  }

  getDependencies(projectId: number) {
    return this.http.get<any[]>(`${this.projectsUrl}/${projectId}/dependencies`);
  }
}
