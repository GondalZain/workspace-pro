const express = require('express');
const controller = require('./task.controller');
const { requirePermission } = require('../../middleware/auth.middleware');
const { requireFeature } = require('../../middleware/subscription.middleware');
const { routes } = require('../../config/routes');

const notesRoutes = require('../notes/notes.routes');

const router = express.Router();

router.use('/:taskId/notes', notesRoutes);

router.get(routes.taskPaths.statuses, requirePermission('tasks.read'), controller.getStatuses);
router.put(routes.taskPaths.statuses, requirePermission('tasks.update'), requireFeature('tasks.dynamic_statuses'), controller.updateStatuses);
router.get('/statuses/usage', requirePermission('tasks.read'), controller.checkStatusTaskUsage);
router.get(routes.taskPaths.statusTemplates, requirePermission('tasks.read'), controller.getStatusTemplates);

router.post(routes.taskPaths.statusTemplates, requirePermission('tasks.update'), requireFeature('tasks.dynamic_statuses'), controller.saveStatusTemplate);
router.delete(routes.taskPaths.statusTemplateById, requirePermission('tasks.update'), requireFeature('tasks.dynamic_statuses'), controller.deleteStatusTemplate);
router.get(routes.taskPaths.list, requirePermission('tasks.read'), controller.getTasks);
router.post(routes.taskPaths.list, requirePermission('tasks.create'), controller.createTask);
router.put(routes.taskPaths.byId, requirePermission('tasks.update'), controller.updateTask);
router.patch(routes.taskPaths.toggle, requirePermission('tasks.update'), controller.toggleTask);
router.delete(routes.taskPaths.completed, requirePermission('tasks.delete'), controller.deleteCompletedTasks);
router.delete(routes.taskPaths.byId, requirePermission('tasks.delete'), controller.deleteTask);

module.exports = router;
