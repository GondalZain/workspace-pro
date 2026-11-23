export type ReadinessStatus = 'pending_test' | 'testing' | 'evaluated' | 'approved';
export type AssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'evaluated';
export type EvaluatedLevel = 'Junior' | 'Mid-Level' | 'Senior' | 'Lead/Architect';
export type ComplexityLevel = 'low' | 'medium' | 'high';

export interface AssessmentQuestion {
  qId: string;
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  scenario: string;
  question: string;
  maxPoints: number;
}

export interface AssessmentQuestionsPayload {
  assessmentTitle: string;
  assessmentOverview: string;
  targetTechStack: string[];
  questions: AssessmentQuestion[];
}

export interface DomainScores {
  backend?: number;
  database?: number;
  frontend?: number;
  security?: number;
  architecture?: number;
}

export interface QuestionResult {
  qId: string;
  pointsEarned: number;
  maxPoints: number;
  critique: string;
}

export interface AssessmentFeedback {
  score: number;
  evaluatedLevel: EvaluatedLevel;
  maxComplexity: ComplexityLevel;
  domainScores: DomainScores;
  summaryFeedback: string;
  strengths: string[];
  gaps: string[];
  questionResults: QuestionResult[];
}

export interface DeveloperAssessment {
  id: number;
  projectId: number;
  projectTitle: string;
  projectDescription?: string;
  projectDeadline?: string | null;
  userId: number;
  username: string;
  email?: string;
  status: AssessmentStatus;
  score?: number | null;
  evaluatedLevel?: EvaluatedLevel | null;
  maxComplexity?: ComplexityLevel | null;
  questions?: AssessmentQuestionsPayload | null;
  answers?: Record<string, string> | null;
  feedback?: AssessmentFeedback | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface ProjectMember {
  memberId: number;
  projectId: number;
  userId: number;
  username: string;
  email?: string;
  profileImagePath?: string | null;
  roleInProject: string;
  readinessStatus: ReadinessStatus;
  assessmentId?: number | null;
  assessmentStatus?: AssessmentStatus | null;
  score?: number | null;
  evaluatedLevel?: EvaluatedLevel | null;
  maxComplexity?: ComplexityLevel | null;
  feedback?: AssessmentFeedback | null;
  assessmentCompletedAt?: string | null;
}

export interface SmartTaskAssignment {
  taskId: number;
  assignedUserId: number;
  developerUsername: string;
  confidenceScore?: number;
  matchingRationale: string;
}

export interface SmartMatchingResult {
  allocationSummary: string;
  assignments: SmartTaskAssignment[];
}
