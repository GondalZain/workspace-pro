const taskRepository = require('./task.repository');
const { validateTaskInput } = require('./task.validation');

function validate(input) {
  const error = validateTaskInput(input);
  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }
}

async function getTasks(userId, filters, isAdmin = false, companyId = null, isSuperAdmin = false) {
  return taskRepository.findAll(userId, filters, isAdmin, companyId, isSuperAdmin);
}

const notificationsRepository = require('../notifications/notifications.repository');

async function notifyAssignedUsers({ task, assigneesToNotify, actorUserId, companyId }) {
  if (!Array.isArray(assigneesToNotify) || assigneesToNotify.length === 0) return;

  const actorName = task.creator?.username || task.creatorUsername || 'A team member';
  const taskTitle = task.title ? `"${task.title}"` : 'a task';

  for (const recipientId of assigneesToNotify) {
    if (Number(recipientId) === Number(actorUserId)) {
      // Don't notify the user who assigned themselves
      continue;
    }

    await notificationsRepository.createNotification({
      companyId: task.companyId || companyId || null,
      recipientUserId: Number(recipientId),
      actorUserId: Number(actorUserId),
      type: 'assignment',
      title: `${actorName} assigned you to ${taskTitle}`,
      message: `You were assigned to task: ${taskTitle}`,
      taskId: task.id
    }).catch((err) => console.error('Failed to create assignment notification:', err));
  }
}

async function createTask(userId, input, companyId = null) {
  validate(input);
  const createdTask = await taskRepository.create(userId, input, companyId);

  if (createdTask && Array.isArray(createdTask.assigneeIds) && createdTask.assigneeIds.length > 0) {
    await notifyAssignedUsers({
      task: createdTask,
      assigneesToNotify: createdTask.assigneeIds,
      actorUserId: userId,
      companyId
    });
  }

  return createdTask;
}

const { pool } = require('../../config/database');

function formatStatus(status) {
  if (!status) return 'Updated';
  return String(status).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function notifyStatusChange({ task, oldStatus, newStatus, actorUserId, companyId }) {
  if (!task || !newStatus || oldStatus === newStatus) return;

  const [[actorRow]] = await pool.query(
    'SELECT username FROM users WHERE id = ?',
    [Number(actorUserId)]
  ).catch(() => [[null]]);

  const actorName = actorRow?.username || 'A team member';
  const taskTitle = task.title ? `"${task.title}"` : 'a task';
  const recipients = new Set();

  // 1. Task Assignees
  if (Array.isArray(task.assigneeIds)) {
    task.assigneeIds.forEach((id) => {
      if (id && Number(id) !== Number(actorUserId)) {
        recipients.add(Number(id));
      }
    });
  }

  // 2. Task Creator
  if (task.userId && Number(task.userId) !== Number(actorUserId)) {
    recipients.add(Number(task.userId));
  }

  // 3. Mentioned users in task description
  if (task.description) {
    const matches = Array.from(task.description.matchAll(/@([a-zA-Z0-9_\.\-]+)/g)).map((m) => m[1].toLowerCase());
    const uniqueMentionedNames = Array.from(new Set(matches));

    if (uniqueMentionedNames.length > 0) {
      const placeholders = uniqueMentionedNames.map(() => '?').join(',');
      const [mentionedUsers] = await pool.query(
        `SELECT id FROM users WHERE LOWER(username) IN (${placeholders}) OR LOWER(REPLACE(username, ' ', '')) IN (${placeholders})`,
        [...uniqueMentionedNames, ...uniqueMentionedNames]
      ).catch(() => [[]]);

      for (const u of mentionedUsers) {
        if (Number(u.id) !== Number(actorUserId)) {
          recipients.add(Number(u.id));
        }
      }
    }
  }

  // 4. Mentioned users in task notes/comments
  const [noteRows] = await pool.query(
    'SELECT content FROM task_notes WHERE task_id = ?',
    [task.id]
  ).catch(() => [[]]);

  if (noteRows && noteRows.length > 0) {
    const allNoteText = noteRows.map((n) => n.content || '').join(' ');
    const noteMatches = Array.from(allNoteText.matchAll(/@([a-zA-Z0-9_\.\-]+)/g)).map((m) => m[1].toLowerCase());
    const uniqueNoteNames = Array.from(new Set(noteMatches));

    if (uniqueNoteNames.length > 0) {
      const placeholders = uniqueNoteNames.map(() => '?').join(',');
      const [noteUsers] = await pool.query(
        `SELECT id FROM users WHERE LOWER(username) IN (${placeholders}) OR LOWER(REPLACE(username, ' ', '')) IN (${placeholders})`,
        [...uniqueNoteNames, ...uniqueNoteNames]
      ).catch(() => [[]]);

      for (const u of noteUsers) {
        if (Number(u.id) !== Number(actorUserId)) {
          recipients.add(Number(u.id));
        }
      }
    }
  }

  const oldStatusLabel = formatStatus(oldStatus);
  const newStatusLabel = formatStatus(newStatus);

  for (const recipientId of recipients) {
    await notificationsRepository.createNotification({
      companyId: task.companyId || companyId || null,
      recipientUserId: recipientId,
      actorUserId: Number(actorUserId),
      type: 'status_change',
      title: `${actorName} changed status of ${taskTitle}`,
      message: `Status updated from "${oldStatusLabel}" to "${newStatusLabel}"`,
      taskId: task.id
    }).catch((err) => console.error('Failed to create status change notification:', err));
  }
}

async function updateTask(userId, id, input, isAdmin = false, companyId = null, isSuperAdmin = false) {
  validate(input);
  const existing = await taskRepository.findById(userId, id, true, companyId, isSuperAdmin);
  const updatedTask = await taskRepository.update(userId, id, input, isAdmin, companyId, isSuperAdmin);

  if (updatedTask) {
    // Notify newly added assignees
    if (Array.isArray(updatedTask.assigneeIds)) {
      const existingIds = new Set((existing?.assigneeIds || []).map((aid) => Number(aid)));
      const newAssignees = updatedTask.assigneeIds.filter((aid) => !existingIds.has(Number(aid)));

      if (newAssignees.length > 0) {
        await notifyAssignedUsers({
          task: updatedTask,
          assigneesToNotify: newAssignees,
          actorUserId: userId,
          companyId
        });
      }
    }

    // Notify involved & mentioned users if status changed
    if (existing && updatedTask.status && existing.status !== updatedTask.status) {
      await notifyStatusChange({
        task: updatedTask,
        oldStatus: existing.status,
        newStatus: updatedTask.status,
        actorUserId: userId,
        companyId
      });
    }
  }

  return updatedTask;
}

async function toggleTask(userId, id, isAdmin = false, companyId = null, isSuperAdmin = false) {
  const existing = await taskRepository.findById(userId, id, true, companyId, isSuperAdmin);
  const toggledTask = await taskRepository.toggle(userId, id, isAdmin, companyId, isSuperAdmin);

  if (existing && toggledTask && existing.status !== toggledTask.status) {
    await notifyStatusChange({
      task: toggledTask,
      oldStatus: existing.status,
      newStatus: toggledTask.status,
      actorUserId: userId,
      companyId
    });
  }

  return toggledTask;
}

async function deleteTask(userId, id, isAdmin = false, companyId = null, isSuperAdmin = false) {
  return taskRepository.remove(userId, id, isAdmin, companyId, isSuperAdmin);
}

async function deleteCompletedTasks(userId, isAdmin = false, companyId = null, isSuperAdmin = false) {
  return taskRepository.clearCompleted(userId, isAdmin, companyId, isSuperAdmin);
}

async function getStatuses(companyId = null) {
  return taskRepository.getStatuses(companyId);
}

async function updateStatuses(companyId = null, statuses = []) {
  if (!Array.isArray(statuses)) {
    const err = new Error('Statuses must be an array.');
    err.statusCode = 400;
    throw err;
  }
  return taskRepository.updateStatuses(companyId, statuses);
}

async function getStatusTemplates(companyId = null) {
  return taskRepository.getStatusTemplates(companyId);
}

async function saveStatusTemplate(name, description, statuses, companyId = null) {
  if (!name || typeof name !== 'string') {
    const err = new Error('Template name is required.');
    err.statusCode = 400;
    throw err;
  }
  return taskRepository.saveStatusTemplate(name, description, statuses, companyId);
}

async function countTasksWithStatus(companyId, slug) {
  return taskRepository.countTasksWithStatus(companyId, slug);
}

async function deleteStatusTemplate(id, companyId = null) {
  return taskRepository.deleteStatusTemplate(Number(id), companyId);
}

module.exports = { getTasks, createTask, updateTask, toggleTask, deleteTask, deleteCompletedTasks, getStatuses, updateStatuses, countTasksWithStatus, getStatusTemplates, saveStatusTemplate, deleteStatusTemplate };







