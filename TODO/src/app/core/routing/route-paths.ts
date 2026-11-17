/**
 * Application routes — change paths HERE ONLY.
 * All route config, Router.navigate(), and routerLink should use exports from this file.
 */

// ---------------------------------------------------------------------------
// Path strings (no leading slash; used in Angular `Routes` and redirects)
// ---------------------------------------------------------------------------

export const AUTH_PATH = {
  landing: 'landing',
  team: 'team',
  pricing: 'pricing',
  login: 'login',
  register: 'register',
  createPassword: 'create-password'
} as const;

export const ADMIN_PATH = {
  root: 'admin',
  users: 'admin/users',
  userCreate: 'admin/users/create',
  userEdit: 'admin/users/edit',
  userEditById: 'admin/users/:id/edit',
  roles: 'admin/roles',
  projects: 'admin/projects',
  projectNew: 'admin/projects/new',
  projectDetail: 'admin/projects/:slug',
  projectEdit: 'admin/projects/:slug/edit',
  tasks: 'admin/tasks',
  tasksKanban: 'admin/tasks/kanban',
  taskNew: 'admin/tasks/new',
  taskDetail: 'admin/task',
  taskEdit: 'admin/task/edit',
  statuses: 'admin/statuses',
  statusDetail: 'admin/statuses/pipeline',
  statusDetailById: 'admin/statuses/:id',
  customFields: 'admin/custom-fields',
  formTemplates: 'admin/form-templates',
  subscription: 'admin/subscription',
  newRole: 'admin/new-role'
} as const;

/** Relative segments under `admin` (child routes). */
export const ADMIN_CHILD_PATH = {
  overview: '',
  users: 'users',
  userCreate: 'users/create',
  userEdit: 'users/edit',
  userEditById: 'users/:id/edit',
  roles: 'roles',
  statuses: 'statuses',
  statusDetail: 'statuses/pipeline',
  statusDetailById: 'statuses/:id',
  customFields: 'custom-fields',
  formTemplates: 'form-templates',
  projects: 'projects',
  projectNew: 'projects/new',
  projectDetail: 'projects/:slug',
  projectEdit: 'projects/:slug/edit',
  tasks: 'tasks',
  tasksKanban: 'tasks/kanban',
  taskNew: 'tasks/new',
  taskDetail: 'task',
  taskEdit: 'task/edit',
  subscription: 'subscription',
  newRole: 'new-role'
} as const;

export const WORKSPACE_PATH = {
  root: 'dashboard',
  tasks: 'dashboard/tasks',
  taskNew: 'dashboard/tasks/new',
  /** Task id is kept in session — URLs do not expose numeric ids. */
  taskDetail: 'dashboard/task',
  taskEdit: 'dashboard/task/edit',
  taskDetailLegacy: 'dashboard/tasks/:id',
  taskEditLegacyById: 'dashboard/tasks/:id/edit',
  taskDetailLegacyById: 'dashboard/task/:id',
  taskEditLegacyByIdPath: 'dashboard/task/:id/edit',
  taskDetailLegacyFlat: 'dashboard/tasks/detail',
  taskEditLegacyFlat: 'dashboard/tasks/edit',
  tasksKanban: 'dashboard/tasks/kanban',
  /** Old top-level URL — redirects to {@link WORKSPACE_PATH.tasksKanban}. */
  kanbanLegacy: 'dashboard/kanban',
  calendar: 'dashboard/calendar',
  timesheet: 'dashboard/timesheet',
  projects: 'dashboard/projects',
  projectNew: 'dashboard/projects/new',
  projectDetail: 'dashboard/projects/:slug',
  projectEdit: 'dashboard/projects/:slug/edit'
} as const;

export const LEGACY_PATH = {
  kanban: 'kanban',
  user: 'user',
  userDashboard: 'user/dashboard',
  userKanban: 'user/kanban',
  userCalendar: 'user/calendar',
  userTimesheet: 'user/timesheet'
} as const;

export const SUPER_ADMIN_PATH = {
  root: 'super-admin',
  dashboard: 'super-admin/dashboard',
  approvals: 'super-admin/approvals',
  settings: 'super-admin/settings',
  marketing: 'super-admin/marketing'
} as const;

export const APP_PATH = {
  home: WORKSPACE_PATH.projects,
  fallback: WORKSPACE_PATH.projects
} as const;

// ---------------------------------------------------------------------------
// URL helpers (leading slash — for routerLink, navigateByUrl, href)
// ---------------------------------------------------------------------------

export function pathToUrl(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function pathToSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

export function projectDetailPath(slug: string): string {
  return `dashboard/projects/${slug}`;
}

export function projectEditPath(slug: string): string {
  return `dashboard/projects/${slug}/edit`;
}

export function adminUserEditPath(userId?: number): string {
  return userId != null ? `admin/users/${userId}/edit` : ADMIN_PATH.userEdit;
}

export function adminProjectDetailPath(slug: string): string {
  return `admin/projects/${slug}`;
}

export function adminProjectEditPath(slug: string): string {
  return `admin/projects/${slug}/edit`;
}

/** Absolute URLs for templates (`routerLink`, links). */
export const ROUTE_URL = {
  landing: pathToUrl(AUTH_PATH.landing),
  team: pathToUrl(AUTH_PATH.team),
  pricing: pathToUrl(AUTH_PATH.pricing),
  login: pathToUrl(AUTH_PATH.login),
  register: pathToUrl(AUTH_PATH.register),
  createPassword: pathToUrl(AUTH_PATH.createPassword),

  superAdmin: pathToUrl(SUPER_ADMIN_PATH.root),
  superAdminDashboard: pathToUrl(SUPER_ADMIN_PATH.dashboard),
  superAdminApprovals: pathToUrl(SUPER_ADMIN_PATH.approvals),
  superAdminSettings: pathToUrl(SUPER_ADMIN_PATH.settings),
  superAdminMarketing: pathToUrl(SUPER_ADMIN_PATH.marketing),
  superAdminCompanyDetail: (id: number) => pathToUrl(`super-admin/companies/${id}`),

  admin: pathToUrl(ADMIN_PATH.root),
  adminUsers: pathToUrl(ADMIN_PATH.users),
  adminUserCreate: pathToUrl(ADMIN_PATH.userCreate),
  adminUserEdit: (userId?: number) => pathToUrl(adminUserEditPath(userId)),
  adminRoles: pathToUrl(ADMIN_PATH.roles),
  adminStatuses: pathToUrl(ADMIN_PATH.statuses),
  adminStatusDetail: (id?: number) => pathToUrl(id != null ? `admin/statuses/${id}` : ADMIN_PATH.statusDetail),
  adminCustomFields: pathToUrl(ADMIN_PATH.customFields),
  adminFormTemplates: pathToUrl(ADMIN_PATH.formTemplates),
  adminSubscription: pathToUrl(ADMIN_PATH.subscription),
  adminProjects: pathToUrl(ADMIN_PATH.projects),
  adminProjectNew: pathToUrl(ADMIN_PATH.projectNew),
  adminProjectDetail: (slug: string) => pathToUrl(adminProjectDetailPath(slug)),
  adminProjectEdit: (slug: string) => pathToUrl(adminProjectEditPath(slug)),
  adminTasks: pathToUrl(ADMIN_PATH.tasks),
  adminTasksKanban: pathToUrl(ADMIN_PATH.tasksKanban),
  adminTaskNew: pathToUrl(ADMIN_PATH.taskNew),
  adminTaskDetail: pathToUrl(ADMIN_PATH.taskDetail),
  adminTaskEdit: pathToUrl(ADMIN_PATH.taskEdit),
  adminNewRole: pathToUrl(ADMIN_PATH.newRole),

  dashboardTasks: pathToUrl(WORKSPACE_PATH.tasks),
  dashboardKanban: pathToUrl(WORKSPACE_PATH.tasksKanban),
  dashboardCalendar: pathToUrl(WORKSPACE_PATH.calendar),
  dashboardTimesheet: pathToUrl(WORKSPACE_PATH.timesheet),
  dashboardProjects: pathToUrl(WORKSPACE_PATH.projects),

  projectNew: pathToUrl(WORKSPACE_PATH.projectNew),
  projectDetail: (slug: string) => pathToUrl(projectDetailPath(slug)),
  projectEdit: (slug: string) => pathToUrl(projectEditPath(slug)),

  taskNew: pathToUrl(WORKSPACE_PATH.taskNew),
  taskDetail: pathToUrl(WORKSPACE_PATH.taskDetail),
  taskEdit: pathToUrl(WORKSPACE_PATH.taskEdit)
} as const;

/** Segment arrays for `Router.navigate()` and `createUrlTree()`. */
export const ROUTES = {
  landing: pathToSegments(AUTH_PATH.landing),
  team: pathToSegments(AUTH_PATH.team),
  pricing: pathToSegments(AUTH_PATH.pricing),
  login: pathToSegments(AUTH_PATH.login),
  register: pathToSegments(AUTH_PATH.register),
  createPassword: pathToSegments(AUTH_PATH.createPassword),

  superAdmin: pathToSegments(SUPER_ADMIN_PATH.root),
  superAdminDashboard: pathToSegments(SUPER_ADMIN_PATH.dashboard),
  superAdminApprovals: pathToSegments(SUPER_ADMIN_PATH.approvals),
  superAdminSettings: pathToSegments(SUPER_ADMIN_PATH.settings),
  superAdminMarketing: pathToSegments(SUPER_ADMIN_PATH.marketing),

  admin: pathToSegments(ADMIN_PATH.root),
  adminUsers: pathToSegments(ADMIN_PATH.users),
  adminUserCreate: pathToSegments(ADMIN_PATH.userCreate),
  adminUserEdit: (userId?: number) => pathToSegments(adminUserEditPath(userId)),
  adminRoles: pathToSegments(ADMIN_PATH.roles),
  adminStatuses: pathToSegments(ADMIN_PATH.statuses),
  adminStatusDetail: (id?: number) => pathToSegments(id != null ? `admin/statuses/${id}` : ADMIN_PATH.statusDetail),
  adminSubscription: pathToSegments(ADMIN_PATH.subscription),
  adminProjects: pathToSegments(ADMIN_PATH.projects),
  adminProjectNew: pathToSegments(ADMIN_PATH.projectNew),
  adminProjectDetail: (slug: string) => pathToSegments(adminProjectDetailPath(slug)),
  adminProjectEdit: (slug: string) => pathToSegments(adminProjectEditPath(slug)),
  adminTasks: pathToSegments(ADMIN_PATH.tasks),
  adminTasksKanban: pathToSegments(ADMIN_PATH.tasksKanban),
  adminTaskNew: pathToSegments(ADMIN_PATH.taskNew),
  adminTaskDetail: pathToSegments(ADMIN_PATH.taskDetail),
  adminTaskEdit: pathToSegments(ADMIN_PATH.taskEdit),
  adminNewRole: pathToSegments(ADMIN_PATH.newRole),

  dashboardTasks: pathToSegments(WORKSPACE_PATH.tasks),
  dashboardKanban: pathToSegments(WORKSPACE_PATH.tasksKanban),
  dashboardCalendar: pathToSegments(WORKSPACE_PATH.calendar),
  dashboardTimesheet: pathToSegments(WORKSPACE_PATH.timesheet),
  dashboardProjects: pathToSegments(WORKSPACE_PATH.projects),

  projectNew: pathToSegments(WORKSPACE_PATH.projectNew),
  projectDetail: (slug: string) => pathToSegments(projectDetailPath(slug)),
  projectEdit: (slug: string) => pathToSegments(projectEditPath(slug)),

  taskNew: pathToSegments(WORKSPACE_PATH.taskNew),
  taskDetail: pathToSegments(WORKSPACE_PATH.taskDetail),
  taskEdit: pathToSegments(WORKSPACE_PATH.taskEdit)
} as const;
