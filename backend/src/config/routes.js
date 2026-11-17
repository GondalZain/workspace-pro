const API_PREFIX = '/api';

const routes = {
  api: API_PREFIX,
  health: `${API_PREFIX}/health`,
  auth: `${API_PREFIX}/auth`,
  chat: `${API_PREFIX}/chat`,
  tasks: `${API_PREFIX}/tasks`,
  projects: `${API_PREFIX}/projects`,
  timesheets: `${API_PREFIX}/timesheets`,
  customFields: `${API_PREFIX}/custom-fields`,
  formTemplates: `${API_PREFIX}/form-templates`,
  notifications: `${API_PREFIX}/notifications`,
  subscriptions: `${API_PREFIX}/subscriptions`,
  superAdminCompanies: `${API_PREFIX}/super-admin/companies`,
  authPaths: {
    register: '/register',
    login: '/login',
    profile: '/profile',
    users: '/users',
    userById: '/users/:id',
    role: '/users/:id/role',
    roles: '/roles',
    roleById: '/roles/:id',
    permissions: '/permissions'
  },
  taskPaths: {
    list: '/',
    statuses: '/statuses',
    statusTemplates: '/status-templates',
    statusTemplateById: '/status-templates/:id',
    byId: '/:id',
    toggle: '/:id/toggle',
    completed: '/completed'
  },
  projectPaths: {
    list: '/',
    byId: '/:id'
  }
};

module.exports = { routes };
