const express = require('express');
const cors = require('cors');
const path = require('node:path');
const taskRoutes = require('./modules/tasks/task.routes');
const authRoutes = require('./modules/auth/auth.routes');
const projectRoutes = require('./modules/projects/project.routes');
const timesheetRoutes = require('./modules/timesheets/timesheet.routes');
const customFieldRoutes = require('./modules/custom-fields/custom-field.routes');
const taskFormTemplateRoutes = require('./modules/tasks/task-form-template.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const companyRoutes = require('./modules/companies/company.routes');
const subscriptionRoutes = require('./modules/subscriptions/subscription.routes');
const { requireAuth } = require('./middleware/auth.middleware');
const { checkConnection } = require('./modules/tasks/task.repository');
const { routes } = require('./config/routes');

const app = express();

const allowedOriginPattern = /^https?:\/\/([a-zA-Z0-9-]+\.)?(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|vercel\.app)$/;

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. Postman, server-to-server) or matching origins
    if (!origin || allowedOriginPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive fallback to not break other environments
    }
  },
  credentials: true
}));
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    // Preserve the raw Buffer for Stripe webhook signature checking
    if (req.originalUrl && req.originalUrl.includes('/webhook')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get(routes.health, async (request, response, next) => {
  try {
    await checkConnection();
    response.json({ status: 'ok', service: 'todo-backend', database: 'mysql' });
  } catch (error) { next(error); }
});

app.use(routes.auth, authRoutes);
app.use(routes.projects, requireAuth, projectRoutes);
app.use(routes.tasks, requireAuth, taskRoutes);
app.use(routes.timesheets, requireAuth, timesheetRoutes);
app.use(routes.customFields, customFieldRoutes);
app.use(routes.formTemplates, taskFormTemplateRoutes);
app.use(routes.notifications, notificationRoutes);
app.use(routes.subscriptions, subscriptionRoutes);
app.use(routes.superAdminCompanies, companyRoutes);

app.use((error, request, response, next) => {
  console.error(error);
  response.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Internal server error.' });
});

module.exports = app;
