import { Project } from '../../../models/project.model';

export function findProjectById(projects: Project[], id: number | null | undefined): Project | null {
  if (id === null || id === undefined || Number.isNaN(id)) return null;
  return projects.find((project) => Number(project.id) === Number(id)) ?? null;
}
