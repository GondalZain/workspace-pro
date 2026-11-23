import { Routes } from '@angular/router';
import { authGuard, dashboardGuard } from '../auth/auth.guard';
import { APP_PATH, LEGACY_PATH, WORKSPACE_PATH } from './route-paths';
import {
  legacyTaskDetailByIdRedirect,
  legacyTaskDetailRedirect,
  legacyTaskEditByIdRedirect,
  legacyTaskEditRedirect,
  taskContextGuard,
  taskEditContextGuard
} from './task-route-legacy.guard';

const loadDashboardPage = () => import('../../pages/user/dashboard/dashboard.page').then((m) => m.DashboardPage);
const loadKanbanPage = () => import('../../pages/user/kanban/kanban.page').then((m) => m.UserKanbanPage);
const loadCalendarPage = () => import('../../pages/user/calendar/calendar.page').then((m) => m.UserCalendarPage);
const loadTimesheetPage = () => import('../../pages/user/timesheet/timesheet.page').then((m) => m.UserTimesheetPage);
const loadUserAssessmentsPage = () => import('../../pages/user/assessments/user-assessments.page').then((m) => m.UserAssessmentsPage);
const loadProjectsPage = () => import('../../pages/user/projects/projects.page').then((m) => m.UserProjectsPage);
const loadNewProjectPage = () => import('../../pages/user/projects/new-project.page').then((m) => m.UserProjectCreatePage);
const loadProjectEditPage = () => import('../../pages/user/projects/edit-project.page').then((m) => m.UserProjectEditPage);
const loadProjectDetailPage = () => import('../../pages/user/projects/project-detail.page').then((m) => m.UserProjectDetailPage);
const loadTaskDetailPage = () => import('../../pages/user/task-detail/task-detail.page').then((m) => m.TaskDetailPage);
const loadTaskEditPage = () => import('../../pages/user/task-edit/task-edit.page').then((m) => m.TaskEditPage);

const workspaceCanActivate = [authGuard, dashboardGuard];

export const userWorkspaceRoutes: Routes = [
  { path: WORKSPACE_PATH.root, redirectTo: WORKSPACE_PATH.projects, pathMatch: 'full' },

  { path: WORKSPACE_PATH.tasksKanban, loadComponent: loadKanbanPage, canActivate: workspaceCanActivate },
  { path: WORKSPACE_PATH.tasks, loadComponent: loadDashboardPage, canActivate: workspaceCanActivate },
  { path: WORKSPACE_PATH.taskNew, loadComponent: loadTaskEditPage, canActivate: workspaceCanActivate },
  { path: WORKSPACE_PATH.taskEdit, loadComponent: loadTaskEditPage, canActivate: [...workspaceCanActivate, taskEditContextGuard] },
  { path: WORKSPACE_PATH.taskDetail, loadComponent: loadTaskDetailPage, canActivate: [...workspaceCanActivate, taskContextGuard] },
  { path: WORKSPACE_PATH.taskDetailLegacy, canActivate: [...workspaceCanActivate, legacyTaskDetailRedirect], loadComponent: loadTaskDetailPage },
  { path: WORKSPACE_PATH.taskEditLegacyById, canActivate: [...workspaceCanActivate, legacyTaskEditRedirect], loadComponent: loadTaskEditPage },
  { path: WORKSPACE_PATH.taskDetailLegacyById, canActivate: [...workspaceCanActivate, legacyTaskDetailByIdRedirect], loadComponent: loadTaskDetailPage },
  { path: WORKSPACE_PATH.taskEditLegacyByIdPath, canActivate: [...workspaceCanActivate, legacyTaskEditByIdRedirect], loadComponent: loadTaskEditPage },

  { path: WORKSPACE_PATH.taskDetailLegacyFlat, redirectTo: WORKSPACE_PATH.taskDetail, pathMatch: 'full' },
  { path: WORKSPACE_PATH.taskEditLegacyFlat, redirectTo: WORKSPACE_PATH.taskNew, pathMatch: 'full' },

  { path: WORKSPACE_PATH.kanbanLegacy, redirectTo: WORKSPACE_PATH.tasksKanban, pathMatch: 'full' },
  { path: WORKSPACE_PATH.calendar, loadComponent: loadCalendarPage, canActivate: workspaceCanActivate },
  { path: WORKSPACE_PATH.timesheet, loadComponent: loadTimesheetPage, canActivate: workspaceCanActivate },
  { path: WORKSPACE_PATH.assessments, loadComponent: loadUserAssessmentsPage, canActivate: workspaceCanActivate },

  { path: WORKSPACE_PATH.projectNew, loadComponent: loadNewProjectPage, canActivate: workspaceCanActivate },
  { path: WORKSPACE_PATH.projectEdit, loadComponent: loadProjectEditPage, canActivate: workspaceCanActivate },
  { path: WORKSPACE_PATH.projectDetail, loadComponent: loadProjectDetailPage, canActivate: workspaceCanActivate },
  { path: WORKSPACE_PATH.projects, loadComponent: loadProjectsPage, canActivate: workspaceCanActivate }
];

export const userWorkspaceLegacyRedirects: Routes = [
  { path: LEGACY_PATH.kanban, redirectTo: WORKSPACE_PATH.tasksKanban, pathMatch: 'full' },
  { path: LEGACY_PATH.user, redirectTo: WORKSPACE_PATH.projects, pathMatch: 'full' },
  { path: LEGACY_PATH.userDashboard, redirectTo: WORKSPACE_PATH.projects, pathMatch: 'full' },
  { path: LEGACY_PATH.userKanban, redirectTo: WORKSPACE_PATH.tasksKanban, pathMatch: 'full' },
  { path: LEGACY_PATH.userCalendar, redirectTo: WORKSPACE_PATH.calendar, pathMatch: 'full' },
  { path: LEGACY_PATH.userTimesheet, redirectTo: WORKSPACE_PATH.timesheet, pathMatch: 'full' }
];
