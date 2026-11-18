const taskRepository = require('./task.repository');
const { validateTaskInput } = require('./task.validation');
const { pool } = require('../../config/database');
const notificationsRepository = require('../notifications/notifications.repository');

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

async function notifyAssignedUsers({ task, assigneesToNotify, actorUserId, companyId }) {
  if (!Array.isArray(assigneesToNotify) || assigneesToNotify.length === 0) return;

  // Retrieve actor details (username and role name)
  let actorName = 'A team member';
  try {
    const [[actorRow]] = await pool.query(
      `SELECT u.username, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? LIMIT 1`,
      [Number(actorUserId)]
    );
    if (actorRow?.username) {
      actorName = actorRow.role_name
        ? `${actorRow.username} (${actorRow.role_name})`
        : actorRow.username;
    }
  } catch {}

  // Retrieve project name if associated
  let projectName = null;
  if (task.projectId) {
    try {
      const [[projectRow]] = await pool.query(
        'SELECT title FROM projects WHERE id = ? LIMIT 1',
        [Number(task.projectId)]
      );
      if (projectRow?.title) {
        projectName = projectRow.title;
      }
    } catch {}
  }

  const taskTitle = task.title ? `"${task.title}"` : 'a task';
  const mailService = require('../../services/mail.service');
  const clientBaseUrl = (process.env.APP_CLIENT_URL || 'https://workspace-pro-cw2a.vercel.app').replace(/\/$/, '');

  for (const recipientId of assigneesToNotify) {
    if (Number(recipientId) === Number(actorUserId)) {
      // Don't notify the user who assigned themselves
      continue;
    }

    // 1. In-app database notification
    await notificationsRepository.createNotification({
      companyId: task.companyId || companyId || null,
      recipientUserId: Number(recipientId),
      actorUserId: Number(actorUserId),
      type: 'assignment',
      title: `${actorName} assigned you to ${taskTitle}`,
      message: `You were assigned to task: ${taskTitle}`,
      taskId: task.id
    }).catch((err) => console.error('Failed to create assignment notification:', err));

    // 2. Email alert to assignee's original notification email (or primary email)
    try {
      const [[recipientUser]] = await pool.query(
        `SELECT u.id, u.username, u.email, u.original_email,
                c.name AS company_name, c.primary_color AS company_primary_color, c.domain AS company_domain
         FROM users u
         LEFT JOIN companies c ON c.id = u.company_id
         WHERE u.id = ? LIMIT 1`,
        [Number(recipientId)]
      ).catch(() => [[null]]);

      if (recipientUser) {
        const targetEmail = (recipientUser.original_email && recipientUser.original_email.trim())
          ? recipientUser.original_email.trim()
          : (recipientUser.email && recipientUser.email.trim() ? recipientUser.email.trim() : null);

        if (targetEmail && targetEmail.includes('@')) {
          const companyIdentifier = recipientUser.company_domain || recipientUser.company_name || '';
          const userLoginEmail = recipientUser.email || targetEmail;
          const companyLoginUrl = `${clientBaseUrl}/login?company=${encodeURIComponent(companyIdentifier)}&email=${encodeURIComponent(userLoginEmail)}&returnUrl=%2Ftasks`;
          const taskUrl = `${clientBaseUrl}/tasks?company=${encodeURIComponent(companyIdentifier)}`;
          const formattedDueDate = (task.dueDate && String(task.dueDate).trim() && !isNaN(new Date(task.dueDate).getTime()))
            ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : null;

          await mailService.sendTaskAssignedEmail({
            recipientEmail: targetEmail,
            userLoginEmail,
            recipientName: recipientUser.username || 'Team Member',
            taskTitle: task.title || 'Untitled Task',
            taskDescription: task.description || '',
            actorName,
            companyName: recipientUser.company_name || 'Workspace Pro',
            companyPrimaryColor: recipientUser.company_primary_color || '#0f766e',
            priority: task.priority || null,
            dueDate: formattedDueDate,
            category: task.category || null,
            projectName,
            taskUrl,
            companyLoginUrl
          }).catch((err) => console.error('[MailService] Task assignment email dispatch error:', err));
        }
      }
    } catch (mailErr) {
      console.error('[MailService] Error fetching recipient for assignment email:', mailErr);
    }
  }
}

async function createTask(userId, input, companyId = null) {
  // Gracefully fallback to company's first project if none explicitly supplied
  if ((input.projectId == null || input.projectId === '') && companyId) {
    try {
      const [[firstProject]] = await pool.query(
        'SELECT id FROM projects WHERE company_id = ? ORDER BY id ASC LIMIT 1',
        [Number(companyId)]
      );
      if (firstProject?.id) {
        input.projectId = firstProject.id;
      }
    } catch {}
  }

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

function formatStatus(status) {
  if (!status) return 'Updated';
  return String(status).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function notifyTaskUpdate({ task, existingTask, actorUserId, companyId, customUpdateMessage = null }) {
  if (!task) return;

  // Determine what changed
  const changeParts = [];
  if (existingTask && existingTask.status && task.status && existingTask.status !== task.status) {
    changeParts.push(`Status changed from "${formatStatus(existingTask.status)}" to "${formatStatus(task.status)}"`);
  }
  if (existingTask && existingTask.priority && task.priority && existingTask.priority !== task.priority) {
    changeParts.push(`Priority changed from "${formatStatus(existingTask.priority)}" to "${formatStatus(task.priority)}"`);
  }
  if (existingTask && existingTask.dueDate !== task.dueDate) {
    const formattedDue = (task.dueDate && String(task.dueDate).trim() && !isNaN(new Date(task.dueDate).getTime()))
      ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'No due date';
    changeParts.push(`Due date updated to ${formattedDue}`);
  }
  if (existingTask && existingTask.title && task.title && existingTask.title !== task.title) {
    changeParts.push(`Title updated to "${task.title}"`);
  }
  if (customUpdateMessage) {
    changeParts.push(customUpdateMessage);
  }
  if (changeParts.length === 0) {
    changeParts.push('Task details were updated');
  }

  const updateSummary = changeParts.join(' • ');

  // Retrieve actor details
  let actorName = 'A team member';
  try {
    const [[actorRow]] = await pool.query(
      `SELECT u.username, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? LIMIT 1`,
      [Number(actorUserId)]
    );
    if (actorRow?.username) {
      actorName = actorRow.role_name
        ? `${actorRow.username} (${actorRow.role_name})`
        : actorRow.username;
    }
  } catch {}

  // Retrieve project name if associated
  let projectName = null;
  if (task.projectId) {
    try {
      const [[projectRow]] = await pool.query(
        'SELECT title FROM projects WHERE id = ? LIMIT 1',
        [Number(task.projectId)]
      );
      if (projectRow?.title) projectName = projectRow.title;
    } catch {}
  }

  const recipients = new Set();

  // 1. Task Assignees (except actor)
  if (Array.isArray(task.assigneeIds)) {
    task.assigneeIds.forEach((id) => {
      if (id && Number(id) !== Number(actorUserId)) {
        recipients.add(Number(id));
      }
    });
  }

  // 2. Task Creator (except actor)
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

  if (recipients.size === 0) return;

  const mailService = require('../../services/mail.service');
  const clientBaseUrl = (process.env.APP_CLIENT_URL || 'https://workspace-pro-cw2a.vercel.app').replace(/\/$/, '');
  const taskTitle = task.title ? `"${task.title}"` : 'a task';

  for (const recipientId of recipients) {
    // 1. In-app database notification
    await notificationsRepository.createNotification({
      companyId: task.companyId || companyId || null,
      recipientUserId: recipientId,
      actorUserId: Number(actorUserId),
      type: 'task_update',
      title: `${actorName} updated ${taskTitle}`,
      message: updateSummary,
      taskId: task.id
    }).catch((err) => console.error('Failed to create task update notification:', err));

    // 2. Email alert to involved user's original notification email
    try {
      const [[recipientUser]] = await pool.query(
        `SELECT u.id, u.username, u.email, u.original_email,
                c.name AS company_name, c.primary_color AS company_primary_color, c.domain AS company_domain
         FROM users u
         LEFT JOIN companies c ON c.id = u.company_id
         WHERE u.id = ? LIMIT 1`,
        [Number(recipientId)]
      ).catch(() => [[null]]);

      if (recipientUser) {
        const targetEmail = (recipientUser.original_email && recipientUser.original_email.trim())
          ? recipientUser.original_email.trim()
          : (recipientUser.email && recipientUser.email.trim() ? recipientUser.email.trim() : null);

        if (targetEmail && targetEmail.includes('@')) {
          const companyIdentifier = recipientUser.company_domain || recipientUser.company_name || '';
          const userLoginEmail = recipientUser.email || targetEmail;
          const companyLoginUrl = `${clientBaseUrl}/login?company=${encodeURIComponent(companyIdentifier)}&email=${encodeURIComponent(userLoginEmail)}&returnUrl=%2Ftasks`;
          const taskUrl = `${clientBaseUrl}/tasks?company=${encodeURIComponent(companyIdentifier)}`;
          const formattedDueDate = (task.dueDate && String(task.dueDate).trim() && !isNaN(new Date(task.dueDate).getTime()))
            ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : null;

          await mailService.sendTaskUpdatedEmail({
            recipientEmail: targetEmail,
            userLoginEmail,
            recipientName: recipientUser.username || 'Team Member',
            taskTitle: task.title || 'Untitled Task',
            updateSummary,
            taskDescription: task.description || '',
            actorName,
            companyName: recipientUser.company_name || 'Workspace Pro',
            companyPrimaryColor: recipientUser.company_primary_color || '#0f766e',
            status: task.status ? formatStatus(task.status) : 'Updated',
            priority: task.priority || null,
            dueDate: formattedDueDate,
            category: task.category || null,
            projectName,
            taskUrl,
            companyLoginUrl
          }).catch((err) => console.error('[MailService] Task update email dispatch error:', err));
        }
      }
    } catch (mailErr) {
      console.error('[MailService] Error fetching recipient for update email:', mailErr);
    }
  }
}

async function updateTask(userId, id, input, isAdmin = false, companyId = null, isSuperAdmin = false) {
  validate(input);
  const existing = await taskRepository.findById(userId, id, true, companyId, isSuperAdmin);
  const updatedTask = await taskRepository.update(userId, id, input, isAdmin, companyId, isSuperAdmin);

  if (updatedTask) {
    // 1. Notify newly added assignees
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

    // 2. Notify all involved users (assignees, creator, mentioned users) about the update
    await notifyTaskUpdate({
      task: updatedTask,
      existingTask: existing,
      actorUserId: userId,
      companyId
    });
  }

  return updatedTask;
}

async function toggleTask(userId, id, isAdmin = false, companyId = null, isSuperAdmin = false) {
  const existing = await taskRepository.findById(userId, id, true, companyId, isSuperAdmin);
  const toggledTask = await taskRepository.toggle(userId, id, isAdmin, companyId, isSuperAdmin);

  if (existing && toggledTask && existing.status !== toggledTask.status) {
    await notifyTaskUpdate({
      task: toggledTask,
      existingTask: existing,
      actorUserId: userId,
      companyId,
      customUpdateMessage: `Task status toggled to "${formatStatus(toggledTask.status)}"`
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







