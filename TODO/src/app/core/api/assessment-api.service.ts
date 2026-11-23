import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';
import {
  DeveloperAssessment,
  ProjectMember,
  SmartMatchingResult,
  AssessmentFeedback
} from '../../models/assessment.model';

@Injectable({ providedIn: 'root' })
export class AssessmentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/assessments`;

  getProjectMembers(projectId: number): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(`${this.baseUrl}/project/${projectId}/members`);
  }

  setProjectMembers(projectId: number, userIds: number[]): Observable<ProjectMember[]> {
    return this.http.post<ProjectMember[]>(`${this.baseUrl}/project/${projectId}/members`, { userIds });
  }

  generateAssessments(
    projectId: number,
    targetUserIds?: number[]
  ): Observable<{ message: string; generatedCount: number; assessmentOverview?: string }> {
    return this.http.post<{ message: string; generatedCount: number; assessmentOverview?: string }>(
      `${this.baseUrl}/project/${projectId}/generate`,
      { targetUserIds }
    );
  }

  getMyPendingAssessments(): Observable<DeveloperAssessment[]> {
    return this.http.get<DeveloperAssessment[]>(`${this.baseUrl}/my-pending`);
  }

  getCompanyAssessments(): Observable<DeveloperAssessment[]> {
    return this.http.get<DeveloperAssessment[]>(`${this.baseUrl}/company/all`);
  }

  getAssessmentById(assessmentId: number): Observable<DeveloperAssessment> {
    return this.http.get<DeveloperAssessment>(`${this.baseUrl}/${assessmentId}`);
  }

  submitAssessment(
    assessmentId: number,
    answers: Record<string, string>
  ): Observable<{
    message: string;
    assessmentId: number;
    score: number;
    evaluatedLevel: string;
    maxComplexity: string;
    feedback: AssessmentFeedback;
  }> {
    return this.http.post<{
      message: string;
      assessmentId: number;
      score: number;
      evaluatedLevel: string;
      maxComplexity: string;
      feedback: AssessmentFeedback;
    }>(`${this.baseUrl}/${assessmentId}/submit`, { answers });
  }

  smartMatchTasks(projectId: number): Observable<SmartMatchingResult> {
    return this.http.get<SmartMatchingResult>(`${this.baseUrl}/project/${projectId}/smart-match`);
  }

  applyTaskAssignments(
    projectId: number,
    assignments: Array<{ taskId: number; assignedUserId: number; matchingRationale?: string }>
  ): Observable<{ message: string; updatedTasksCount: number }> {
    return this.http.post<{ message: string; updatedTasksCount: number }>(
      `${this.baseUrl}/project/${projectId}/apply-assignments`,
      { assignments }
    );
  }

  startProject(projectId: number): Observable<{ message: string; projectStatus: string }> {
    return this.http.post<{ message: string; projectStatus: string }>(
      `${this.baseUrl}/project/${projectId}/start-project`,
      {}
    );
  }

  runAutoWorkflow(projectId: number): Observable<{
    success: boolean;
    stage: string;
    message: string;
    projectStatus?: string;
    allocatedCount?: number;
    evaluatedCount?: number;
    totalMembers?: number;
    matchSummary?: string;
    generatedAssessmentsCount?: number;
  }> {
    return this.http.post<{
      success: boolean;
      stage: string;
      message: string;
      projectStatus?: string;
      allocatedCount?: number;
      evaluatedCount?: number;
      totalMembers?: number;
      matchSummary?: string;
      generatedAssessmentsCount?: number;
    }>(`${this.baseUrl}/project/${projectId}/auto-workflow`, {});
  }
}
