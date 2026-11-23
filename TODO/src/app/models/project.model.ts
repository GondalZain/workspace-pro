export interface Project {
  id: number;
  userId?: number | null;
  defaultAssigneeId?: number | null;
  formTemplateId?: number | null;
  creatorUsername?: string | null;
  title: string;
  description: string;
  deadline?: string | null;
  status?: string | null;
  imagePath?: string | null;
  customFields?: Record<string, any>;
  createdAt: string;
}

export type NewProject = {
  title: string;
  description: string;
  deadline?: string | null;
  status?: string | null;
  imagePath?: string | null;
  defaultAssigneeId?: number | null;
  formTemplateId?: number | null;
  customFields?: Record<string, any>;
};
