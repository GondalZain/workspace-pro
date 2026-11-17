import { Project } from '../../../models/project.model';
import { ROUTES } from '../../../core/routing/route-paths';
import { findProjectById } from './project-id.util';

export function slugifyProjectTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'project';
}

/** URL segment for a project (title-based; adds id only if titles collide). */
export function projectSlug(project: Pick<Project, 'id' | 'title'>, allProjects: Project[] = []): string {
  const base = slugifyProjectTitle(project.title);
  const hasDuplicate = allProjects.some(
    (p) => p.id !== project.id && slugifyProjectTitle(p.title) === base
  );
  return hasDuplicate ? `${base}-${project.id}` : base;
}

export function findProjectBySlug(projects: Project[], slug: string | null | undefined): Project | null {
  if (!slug) return null;

  const decoded = decodeURIComponent(slug);

  const bySlug = projects.find((p) => projectSlug(p, projects) === decoded);
  if (bySlug) return bySlug;

  const numeric = Number(decoded);
  if (!Number.isNaN(numeric)) {
    return findProjectById(projects, numeric);
  }

  const suffixMatch = decoded.match(/^(.+)-(\d+)$/);
  if (suffixMatch) {
    const id = Number(suffixMatch[2]);
    const candidate = findProjectById(projects, id);
    if (candidate && projectSlug(candidate, projects) === decoded) {
      return candidate;
    }
  }

  return null;
}

export function projectDetailNav(project: Project, allProjects: Project[], isAdmin: boolean = false): string[] {
  const slug = projectSlug(project, allProjects);
  return isAdmin ? ROUTES.adminProjectDetail(slug) : ROUTES.projectDetail(slug);
}

export function projectEditNav(project: Project, allProjects: Project[], isAdmin: boolean = false): string[] {
  const slug = projectSlug(project, allProjects);
  return isAdmin ? ROUTES.adminProjectEdit(slug) : ROUTES.projectEdit(slug);
}

export function projectDetailNavById(projects: Project[], projectId: number | null, isAdmin: boolean = false): string[] {
  const project = findProjectById(projects, projectId);
  if (!project) {
    return isAdmin ? ROUTES.adminProjects : ROUTES.dashboardProjects;
  }
  return projectDetailNav(project, projects, isAdmin);
}
