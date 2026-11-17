const taskService = require('./task.service');
const notificationsController = require('../notifications/notifications.controller');


async function getTasks(request, response, next) {
  try {
    const isAdmin = request.userAccess?.role === 'admin' || request.user?.role === 'admin';
    response.json(await taskService.getTasks(
      Number(request.user.sub),
      request.query,
      isAdmin,
      request.user.companyId,
      request.user.isSuperAdmin
    ));
  } catch (error) { next(error); }
}

async function createTask(request, response, next) {
  try {
    response.status(201).json(await taskService.createTask(
      Number(request.user.sub),
      request.body,
      request.user.companyId
    ));
  } catch (error) { next(error); }
}

async function updateTask(request, response, next) {
  try {
    const isAdmin = request.userAccess?.role === 'admin' || request.user?.role === 'admin';
    const task = await taskService.updateTask(
      Number(request.user.sub),
      Number(request.params.id),
      request.body,
      isAdmin,
      request.user.companyId,
      request.user.isSuperAdmin
    );
    if (!task) return response.status(404).json({ error: 'Task not found.' });
    response.json(task);
  } catch (error) { next(error); }
}

async function toggleTask(request, response, next) {
  try {
    const isAdmin = request.userAccess?.role === 'admin' || request.user?.role === 'admin';
    const task = await taskService.toggleTask(
      Number(request.user.sub),
      Number(request.params.id),
      isAdmin,
      request.user.companyId,
      request.user.isSuperAdmin
    );
    if (!task) return response.status(404).json({ error: 'Task not found.' });
    response.json(task);
  } catch (error) { next(error); }
}

async function deleteTask(request, response, next) {
  try {
    const isAdmin = request.userAccess?.role === 'admin' || request.user?.role === 'admin';
    if (!await taskService.deleteTask(
      Number(request.user.sub),
      Number(request.params.id),
      isAdmin,
      request.user.companyId,
      request.user.isSuperAdmin
    )) return response.status(404).json({ error: 'Task not found.' });
    response.status(204).send();
  } catch (error) { next(error); }
}

async function deleteCompletedTasks(request, response, next) {
  try {
    const isAdmin = request.userAccess?.role === 'admin' || request.user?.role === 'admin';
    response.json({ deleted: await taskService.deleteCompletedTasks(
      Number(request.user.sub),
      isAdmin,
      request.user.companyId,
      request.user.isSuperAdmin
    ) });
  } catch (error) { next(error); }
}

async function getStatuses(request, response, next) {
  try {
    const statuses = await taskService.getStatuses(request.user?.companyId);
    response.json(statuses);
  } catch (error) { next(error); }
}

async function updateStatuses(request, response, next) {
  try {
    const hasPermission = 
      request.userAccess?.permissions?.includes('statuses.manage') ||
      request.userAccess?.role === 'admin' ||
      request.user?.role === 'admin' ||
      request.user?.isSuperAdmin;

    if (!hasPermission) {
      return response.status(403).json({ error: 'Permission denied. You do not have permission to configure task statuses.' });
    }
    const companyId = request.user?.companyId;
    const updated = await taskService.updateStatuses(companyId, request.body);
    
    // Broadcast real-time status update event to all connected company users
    notificationsController.sendToCompany(companyId, 'statuses_updated', {
      companyId,
      statuses: updated
    });

    response.json(updated);
  } catch (error) { next(error); }
}


async function checkStatusTaskUsage(request, response, next) {
  try {
    const identifier = request.query.name || request.query.id || request.query.statusId || request.query.slug || request.params.slug;
    const companyId = request.user?.companyId;
    const count = await taskService.countTasksWithStatus(companyId, identifier);
    response.json({ identifier, slug: identifier, taskCount: count, canDelete: count === 0 });
  } catch (error) { next(error); }
}


async function getStatusTemplates(request, response, next) {
  try {
    const templates = await taskService.getStatusTemplates(request.user?.companyId);
    response.json(templates);
  } catch (error) { next(error); }
}

async function saveStatusTemplate(request, response, next) {
  try {
    const isAdmin = request.userAccess?.role === 'admin' || request.user?.role === 'admin' || request.user?.isSuperAdmin;
    if (!isAdmin) {
      return response.status(403).json({ error: 'Permission denied.' });
    }
    const { name, description, statuses } = request.body;
    const created = await taskService.saveStatusTemplate(name, description, statuses, request.user?.companyId);
    response.status(201).json(created);
  } catch (error) { next(error); }
}

async function deleteStatusTemplate(request, response, next) {
  try {
    const isAdmin = request.userAccess?.role === 'admin' || request.user?.role === 'admin' || request.user?.isSuperAdmin;
    if (!isAdmin) {
      return response.status(403).json({ error: 'Permission denied.' });
    }
    const success = await taskService.deleteStatusTemplate(request.params.id, request.user?.companyId);
    if (!success) return response.status(404).json({ error: 'Template not found or cannot delete system default.' });
    response.status(204).send();
  } catch (error) { next(error); }
}

module.exports = { getTasks, createTask, updateTask, toggleTask, deleteTask, deleteCompletedTasks, getStatuses, updateStatuses, checkStatusTaskUsage, getStatusTemplates, saveStatusTemplate, deleteStatusTemplate };





