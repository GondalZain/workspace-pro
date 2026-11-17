export const API_ROUTES = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    profile: '/auth/profile',
    users: '/auth/users',
    userById: (userId: number) => `/auth/users/${userId}`,
    role: (userId: number) => `/auth/users/${userId}/role`,
    roles: '/auth/roles',
    roleById: (roleId: number) => `/auth/roles/${roleId}`,
    permissions: '/auth/permissions'
  },
  notes: {
    byTask: (taskId: number) => `/tasks/${taskId}/notes`
  },
  tasks: {
    list: '/tasks',
    statuses: '/tasks/statuses',
    statusTemplates: '/tasks/status-templates',
    statusTemplateById: (id: number) => `/tasks/status-templates/${id}`,
    byId: (taskId: number) => `/tasks/${taskId}`,
    toggle: (taskId: number) => `/tasks/${taskId}/toggle`,
    completed: '/tasks/completed'
  },
  formTemplates: {
    list: '/form-templates',
    default: '/form-templates/default',
    byId: (id: number) => `/form-templates/${id}`
  }
} as const;
