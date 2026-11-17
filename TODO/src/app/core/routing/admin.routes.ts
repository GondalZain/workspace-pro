import { Routes } from '@angular/router';
import { adminGuard, authGuard } from '../auth/auth.guard';
import { ADMIN_CHILD_PATH, ADMIN_PATH } from './route-paths';

const loadAdminPage = () => import('../../pages/admin/admin.page').then((m) => m.AdminPage);
const loadAdminOverviewPage = () => import('../../pages/admin/overview/overview.page').then((m) => m.AdminOverviewPage);
const loadAdminUsersPage = () => import('../../pages/admin/users/users.page').then((m) => m.AdminUsersPage);
const loadAdminUserEditPage = () => import('../../pages/admin/user-edit/user-edit.page').then((m) => m.AdminUserEditPage);
const loadAdminUserCreatePage = () => import('../../pages/admin/user-create/user-create.page').then((m) => m.AdminUserCreatePage);
const loadAdminRolesPage = () => import('../../pages/admin/roles/roles.page').then((m) => m.AdminRolesPage);
const loadAdminProjectsPage = () => import('../../pages/admin/projects/projects.page').then((m) => m.AdminProjectsPage);
const loadAdminProjectCreatePage = () => import('../../pages/user/projects/new-project.page').then((m) => m.UserProjectCreatePage);
const loadAdminProjectEditPage = () => import('../../pages/user/projects/edit-project.page').then((m) => m.UserProjectEditPage);
const loadAdminProjectDetailPage = () => import('../../pages/user/projects/project-detail.page').then((m) => m.UserProjectDetailPage);
const loadDashboardPage = () => import('../../pages/user/dashboard/dashboard.page').then((m) => m.DashboardPage);
const loadKanbanPage = () => import('../../pages/user/kanban/kanban.page').then((m) => m.UserKanbanPage);
const loadTaskDetailPage = () => import('../../pages/user/task-detail/task-detail.page').then((m) => m.TaskDetailPage);
const loadTaskEditPage = () => import('../../pages/user/task-edit/task-edit.page').then((m) => m.TaskEditPage);
const loadAdminStatusesPage = () => import('../../pages/admin/statuses/statuses.page').then((m) => m.AdminStatusesPage);
const loadAdminStatusDetailPage = () => import('../../pages/admin/status-detail/status-detail.page').then((m) => m.AdminStatusDetailPage);
const loadAdminCustomFieldsPage = () => import('../../pages/admin/custom-fields/custom-fields.page').then((m) => m.AdminCustomFieldsPage);
const loadAdminFormTemplatesPage = () => import('../../pages/admin/form-templates/form-templates.page').then((m) => m.AdminFormTemplatesPage);
const loadAdminSubscriptionPage = () => import('../../pages/admin/subscription/subscription.page').then((m) => m.AdminSubscriptionPage);
const loadAdminNewRolePage = () => import('../../pages/admin/new-role/new-role.page').then((m) => m.AdminNewRolePage);



const adminCanActivate = [authGuard, adminGuard];

export const adminRoutes: Routes = [
  {
    path: ADMIN_PATH.root,
    loadComponent: loadAdminPage,
    canActivate: adminCanActivate,
    children: [
      { path: ADMIN_CHILD_PATH.overview, pathMatch: 'full', loadComponent: loadAdminOverviewPage },
      { path: ADMIN_CHILD_PATH.users, loadComponent: loadAdminUsersPage },
      { path: ADMIN_CHILD_PATH.userCreate, loadComponent: loadAdminUserCreatePage },
      { path: ADMIN_CHILD_PATH.userEdit, loadComponent: loadAdminUserEditPage },
      { path: ADMIN_CHILD_PATH.userEditById, loadComponent: loadAdminUserEditPage },
      { path: ADMIN_CHILD_PATH.roles, loadComponent: loadAdminRolesPage },
      { path: ADMIN_CHILD_PATH.statuses, loadComponent: loadAdminStatusesPage },
      { path: ADMIN_CHILD_PATH.statusDetail, loadComponent: loadAdminStatusDetailPage },
      { path: ADMIN_CHILD_PATH.statusDetailById, loadComponent: loadAdminStatusDetailPage },
      { path: ADMIN_CHILD_PATH.customFields, loadComponent: loadAdminFormTemplatesPage },
      { path: ADMIN_CHILD_PATH.formTemplates, loadComponent: loadAdminFormTemplatesPage },
      { path: ADMIN_CHILD_PATH.subscription, loadComponent: loadAdminSubscriptionPage },
      { path: ADMIN_CHILD_PATH.projects, loadComponent: loadAdminProjectsPage },
      { path: ADMIN_CHILD_PATH.projectNew, loadComponent: loadAdminProjectCreatePage },
      { path: ADMIN_CHILD_PATH.projectEdit, loadComponent: loadAdminProjectEditPage },
      { path: ADMIN_CHILD_PATH.projectDetail, loadComponent: loadAdminProjectDetailPage },
      { path: ADMIN_CHILD_PATH.tasks, loadComponent: loadDashboardPage },
      { path: ADMIN_CHILD_PATH.tasksKanban, loadComponent: loadKanbanPage },
      { path: ADMIN_CHILD_PATH.taskNew, loadComponent: loadTaskEditPage },
      { path: ADMIN_CHILD_PATH.taskEdit, loadComponent: loadTaskEditPage },
      { path: ADMIN_CHILD_PATH.taskDetail, loadComponent: loadTaskDetailPage },
      { path: ADMIN_CHILD_PATH.newRole, loadComponent: loadAdminNewRolePage }
    ]
  }
];
