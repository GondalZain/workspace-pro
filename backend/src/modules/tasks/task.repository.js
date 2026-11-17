function parseCustomFields(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../../config/database');

// Directory path for persisted task attachments
const TASK_UPLOADS_ROOT = path.join(__dirname, '../../../uploads/tasks');
fs.mkdirSync(TASK_UPLOADS_ROOT, { recursive: true });

/**
 * ============================================================================
 * HELPER: normalizeJsonArray
 * ============================================================================
 * Safely parses JSON strings into arrays, or returns fallback.
 * @param {string|Array} value - Raw value from database
 * @param {Array} fallback - Default array if parsing fails
 * @returns {Array} Parsed array
 */
function normalizeJsonArray(value, fallback = []) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * ============================================================================
 * HELPER: normalizeAttachments
 * ============================================================================
 * Normalizes task attachments column data into an array.
 * @param {string|Array} value - Raw attachments column from DB
 * @returns {Array} Array of attachment objects
 */
function normalizeAttachments(value) {
  return normalizeJsonArray(value, []);
}

/**
 * ============================================================================
 * HELPER: getMimeExtension
 * ============================================================================
 * Maps common MIME types to file extensions for saved attachments.
 * @param {string} type - MIME type string
 * @returns {string} File extension (e.g. '.pdf', '.png')
 */
function getMimeExtension(type) {
  const map = {
    'application/pdf': '.pdf',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };
  return map[type] || '';
}

/**
 * ============================================================================
 * HELPER: sanitizeFileName
 * ============================================================================
 * Cleans filenames to avoid unsafe filesystem characters.
 * @param {string} name - Desired filename
 * @param {string} fallback - Fallback name if invalid
 * @returns {string} Sanitized filename
 */
function sanitizeFileName(name, fallback) {
  const safeName = String(name || fallback).replace(/[\\/]+/g, '-').replace(/[^a-zA-Z0-9_.-]+/g, '-');
  return safeName.trim() || fallback;
}

/**
 * ============================================================================
 * HELPER: persistAttachments
 * ============================================================================
 * Extracts Base64 data URLs from attachments and persists them as files on disk.
 * @param {Array} attachments - Incoming attachment objects
 * @param {string} folderName - Subfolder name within uploads/tasks
 * @returns {Array} Attachments with updated relative server URL paths
 */
function persistAttachments(attachments, folderName) {
  if (!Array.isArray(attachments)) return [];

  const taskFolder = sanitizeFileName(folderName || `task-${Date.now()}`, `task-${Date.now()}`);
  const folderPath = path.join(TASK_UPLOADS_ROOT, taskFolder);
  fs.mkdirSync(folderPath, { recursive: true });

  return attachments.map((attachment, index) => {
    if (!attachment || typeof attachment !== 'object') return attachment;

    const currentDataUrl = typeof attachment.dataUrl === 'string' ? attachment.dataUrl : '';
    if (!currentDataUrl.startsWith('data:')) {
      return { ...attachment, dataUrl: currentDataUrl || '' };
    }

    const match = currentDataUrl.match(/^data:([^;]+);base64,(.*)$/);
    const mimeType = attachment.type || match?.[1] || 'application/octet-stream';
    const originalName = sanitizeFileName(attachment.name || `attachment-${index + 1}`, `attachment-${index + 1}`);
    const extension = path.extname(originalName) || getMimeExtension(mimeType) || '.bin';
    const baseName = path.basename(originalName, path.extname(originalName)) || `attachment-${index + 1}`;
    const fileName = `${baseName}-${Date.now()}-${index}${extension}`;
    const filePath = path.join(folderPath, fileName);

    const buffer = match ? Buffer.from(match[2], 'base64') : Buffer.from(currentDataUrl, 'base64');
    fs.writeFileSync(filePath, buffer);

    return {
      ...attachment,
      name: originalName,
      type: mimeType,
      size: attachment.size || buffer.length,
      dataUrl: `/uploads/tasks/${taskFolder}/${fileName}`
    };
  });
}

/**
 * ============================================================================
 * HELPER: formatSqlDate
 * ============================================================================
 * Formats a Date or date string to 'YYYY-MM-DD'.
 * @param {Date|string|null} val - Date to format
 * @returns {string} Formatted date string
 */
function formatSqlDate(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.slice(0, 10);
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/**
 * Default status stages created for any company that doesn't have custom statuses configured yet.
 */
const DEFAULT_COMPANY_STATUSES = [
  { name: 'To Do', color: '#dc2626', sort_order: 1, is_initial: 1, is_completed: 0, is_default: 1 },
  { name: 'In Progress', color: '#2563eb', sort_order: 2, is_initial: 0, is_completed: 0, is_default: 1 },
  { name: 'Done', color: '#16a34a', sort_order: 3, is_initial: 0, is_completed: 1, is_default: 1 }
];

async function ensureDefaultCompanyStatuses(companyId) {
  const targetCompanyId = Number(companyId);
  if (!targetCompanyId || targetCompanyId <= 0) return [];
  const [existing] = await pool.query('SELECT id, company_id, name, color, sort_order, is_initial, is_completed FROM task_statuses WHERE company_id = ? ORDER BY sort_order ASC, id ASC', [targetCompanyId]);
  if (existing && existing.length > 0) return existing;

  for (const st of DEFAULT_COMPANY_STATUSES) {
    await pool.execute(
      'INSERT INTO task_statuses (company_id, name, color, sort_order, is_initial, is_completed, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [targetCompanyId, st.name, st.color, st.sort_order, st.is_initial, st.is_completed, st.is_default]
    );
  }

  const [created] = await pool.query('SELECT id, company_id, name, color, sort_order, is_initial, is_completed FROM task_statuses WHERE company_id = ? ORDER BY sort_order ASC, id ASC', [targetCompanyId]);
  return created || [];
}

/**
 * ============================================================================
 * FUNCTION: resolveStatusStage
 * ============================================================================
 * Dynamically resolves a status stage row from `task_statuses` for a company.
 * Order of resolution:
 *  1. By explicit status_id (numeric)
 *  2. By status name (case-insensitive string match)
 *  3. Fallback to the company's designated initial stage (is_initial = 1)
 *
 * @param {number|null} companyId - Company ID to filter stages
 * @param {string|null} statusInput - Status name or numeric ID string
 * @param {number|null} statusIdInput - Status ID
 * @returns {Promise<Object|null>} Matching task_status row or null
 */
async function resolveStatusStage(companyId, statusInput, statusIdInput) {
  const targetCompanyId = Number(companyId) || 0;
  let stages = [];
  if (targetCompanyId > 0) {
    stages = await ensureDefaultCompanyStatuses(targetCompanyId);
  }
  if (!stages || stages.length === 0) {
    const [fallbackStages] = await pool.query('SELECT id, company_id, name, color, sort_order, is_initial, is_completed FROM task_statuses WHERE company_id = ? OR company_id = 0 ORDER BY company_id DESC, sort_order ASC, id ASC', [targetCompanyId]);
    stages = fallbackStages || [];
  }
  if (!stages || stages.length === 0) return null;

  // 1. Match by explicit status_id
  if (statusIdInput !== undefined && statusIdInput !== null && statusIdInput !== '') {
    const sId = Number(statusIdInput);
    const byId = stages.find((s) => Number(s.id) === sId);
    if (byId) return byId;
  }

  // 2. Match by status string (could be numeric status_id or stage display name or legacy slug like 'pending')
  if (statusInput !== undefined && statusInput !== null && statusInput !== '') {
    const raw = String(statusInput).trim();
    if (/^\d+$/.test(raw)) {
      const sId = Number(raw);
      const byId = stages.find((s) => Number(s.id) === sId);
      if (byId) return byId;
    }
    const lower = raw.toLowerCase();
    const byName = stages.find((s) => s.name.toLowerCase() === lower);
    if (byName) return byName;

    // Handle legacy aliases like 'pending' -> initial stage, 'completed' -> completed stage
    if (lower === 'pending') {
      const initial = stages.find((s) => Boolean(s.is_initial));
      if (initial) return initial;
    }
    if (lower === 'completed') {
      const completed = stages.find((s) => Boolean(s.is_completed));
      if (completed) return completed;
    }
  }

  // 3. Fallback to initial status stage (is_initial = true)
  const initial = stages.find((s) => Boolean(s.is_initial));
  return initial || stages[0] || null;
}

/**
 * ============================================================================
 * FUNCTION: serializeTask
 * ============================================================================
 * Formats a raw database row from `tasks` (joined with `users` and `task_statuses`)
 * into the standardized API Task model.
 *
 * @param {Object} row - Raw MySQL row
 * @returns {Object} Serialized Task object
 */
function serializeTask(row) {
  return {
    id: Number(row.id),
    companyId: row.company_id ? Number(row.company_id) : null,
    userId: row.user_id !== null && row.user_id !== undefined ? Number(row.user_id) : null,
    projectId: row.project_id !== null && row.project_id !== undefined ? Number(row.project_id) : null,
    creatorUsername: row.creator_username || null,
    assigneeIds: normalizeJsonArray(row.assignee_ids, []).map((id) => Number(id)).filter((id) => !isNaN(id)),
    title: row.title,
    description: row.description,
    completed: Boolean(row.completed),
    statusId: row.status_id !== null && row.status_id !== undefined ? Number(row.status_id) : (row.ts_status_id ? Number(row.ts_status_id) : null),
    status: row.ts_status_name || row.status,
    statusName: row.ts_status_name || row.status,
    priority: row.priority,
    dueDate: formatSqlDate(row.due_date),
    dueTime: row.due_time ? String(row.due_time).slice(0, 5) : '',
    estimatedMinutes: row.estimated_minutes != null ? Number(row.estimated_minutes) : null,
    spentMinutes: row.spent_minutes != null ? Number(row.spent_minutes) : 0,
    category: row.category,
    tags: normalizeJsonArray(row.tags, []),
    attachments: normalizeAttachments(row.attachments),
    customFields: parseCustomFields(row.custom_fields),
    formTemplateId: row.form_template_id != null ? Number(row.form_template_id) : null,
    createdAt: row.created_at.toISOString()
  };
}

/**
 * ============================================================================
 * FUNCTION: taskValues
 * ============================================================================
 * Converts incoming user payload into parameterized query values for INSERT/UPDATE.
 * Ensures status_id and status display name are synchronized from resolvedStage.
 *
 * @param {Object} input - Client task payload
 * @param {Object|null} resolvedStage - Matching status stage object from task_statuses
 * @param {number|null} creatorUserId - User ID of creator
 * @returns {Array} Parameter array for SQL query
 */
function taskValues(input, resolvedStage = null, creatorUserId = null) {
  const attachments = Array.isArray(input.attachments) ? input.attachments : [];
  const assigneeIds = Array.isArray(input.assigneeIds) ? input.assigneeIds.map((id) => Number(id)).filter((id) => !isNaN(id)) : [];
  const statusId = resolvedStage ? Number(resolvedStage.id) : (input.statusId ? Number(input.statusId) : null);
  const isCompleted = resolvedStage ? Boolean(resolvedStage.is_completed) : Boolean(input.completed);

  return [
    creatorUserId ?? input.userId ?? null,
    input.projectId ?? null,
    input.title.trim(),
    input.description?.trim() || '',
    isCompleted,
    statusId,
    input.priority || 'medium',
    input.dueDate || null,
    input.dueTime || null,
    input.estimatedMinutes != null && input.estimatedMinutes !== '' ? Number(input.estimatedMinutes) : null,
    input.spentMinutes != null && input.spentMinutes !== '' ? Number(input.spentMinutes) : 0,
    input.category?.trim() || 'Personal',
    JSON.stringify(Array.isArray(input.tags) ? input.tags : []),
    JSON.stringify(attachments),
    JSON.stringify(assigneeIds)
  ];
}

/**
 * ============================================================================
 * HELPER: attachUsersToTasks
 * ============================================================================
 * Batches user IDs across an array of tasks and populates creator and assignee
 * user profile objects on each task.
 *
 * @param {Array<Object>} tasks - List of task objects
 * @returns {Promise<Array<Object>>} Tasks enriched with creator & assignees objects
 */
async function attachUsersToTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) return tasks;

  const userIds = new Set();
  for (const t of tasks) {
    if (t.userId) userIds.add(Number(t.userId));
    if (Array.isArray(t.assigneeIds)) {
      t.assigneeIds.forEach((id) => userIds.add(Number(id)));
    }
  }

  if (userIds.size === 0) return tasks;

  const userIdsArr = Array.from(userIds);
  const [userRows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.profile_image_path, r.name as role
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id IN (?)`,
    [userIdsArr]
  );

  const userMap = new Map();
  for (const u of userRows) {
    userMap.set(Number(u.id), {
      id: Number(u.id),
      username: u.username,
      email: u.email,
      profileImagePath: u.profile_image_path || null,
      role: u.role || 'user'
    });
  }

  for (const t of tasks) {
    t.creator = t.userId ? (userMap.get(Number(t.userId)) || { id: Number(t.userId), username: t.creatorUsername || 'User' }) : null;
    t.assignees = Array.isArray(t.assigneeIds)
      ? t.assigneeIds.map((id) => userMap.get(Number(id)) || { id: Number(id), username: `User #${id}` }).filter(Boolean)
      : [];
  }

  return tasks;
}

/**
 * ============================================================================
 * FUNCTION: findAll
 * ============================================================================
 * Retrieves tasks applying search, filters, pagination, and user/company scopes.
 * Joins with `task_statuses` ON `ts.id = t.status_id` to get current status names.
 *
 * @param {number} userId - Requesting user ID
 * @param {Object} filters - Search, priority, status, completed, sort, scope
 * @param {boolean} isAdmin - Whether user is company admin
 * @param {number|null} companyId - User's company ID
 * @param {boolean} isSuperAdmin - Whether user is super admin
 * @returns {Promise<Array<Object>>} Array of task objects
 */
async function findAll(userId, filters, isAdmin = false, companyId = null, isSuperAdmin = false) {
  const { search, priority, status, completed, sort = 'created', scope } = filters;
  const conditions = [];
  const values = [];

  if (!isSuperAdmin && companyId) {
    conditions.push('(t.company_id = ? OR u.company_id = ?)');
    values.push(companyId, companyId);
  }

  if (scope === 'my') {
    conditions.push('(t.user_id = ? OR JSON_CONTAINS(t.assignee_ids, CAST(? AS JSON)) OR JSON_SEARCH(t.assignee_ids, \'one\', ?) IS NOT NULL)');
    values.push(userId, JSON.stringify(Number(userId)), String(userId));
  }

  if (search) {
    conditions.push('(t.title LIKE ? OR t.description LIKE ? OR t.category LIKE ? OR JSON_SEARCH(t.tags, \'one\', ?) IS NOT NULL)');
    values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (priority && priority !== 'all') { conditions.push('t.priority = ?'); values.push(priority); }
  if (status && status !== 'all') {
    conditions.push('(ts.name = ? OR CAST(t.status_id AS CHAR) = ?)');
    values.push(status, status);
  }
  if (completed === 'true' || completed === 'false') { conditions.push('t.completed = ?'); values.push(completed === 'true'); }

  const order = sort === 'due' ? 't.due_date ASC' : sort === 'priority' ? "FIELD(t.priority, 'high', 'medium', 'low')" : 't.created_at DESC';
  const query = `
    SELECT t.*, u.username AS creator_username, ts.id as ts_status_id, ts.name as ts_status_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN task_statuses ts ON ts.id = t.status_id
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY ${order}
  `;
  const [rows] = await pool.query(query, values);
  const tasks = rows.map(serializeTask);
  return attachUsersToTasks(tasks);
}

/**
 * ============================================================================
 * FUNCTION: findById
 * ============================================================================
 * Fetches a single task by ID with joined status stage details and users.
 *
 * @param {number} userId - Requesting user ID
 * @param {number} id - Task ID
 * @param {boolean} isAdmin - Whether user is company admin
 * @param {number|null} companyId - User's company ID
 * @param {boolean} isSuperAdmin - Whether user is super admin
 * @returns {Promise<Object|null>} Task object or null
 */
async function findById(userId, id, isAdmin = false, companyId = null, isSuperAdmin = false) {
  let query = `
    SELECT t.*, u.username AS creator_username, ts.id as ts_status_id, ts.name as ts_status_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.user_id
    LEFT JOIN task_statuses ts ON ts.id = t.status_id
    WHERE t.id = ?
  `;
  const values = [id];
  if (!isSuperAdmin && companyId) {
    query += ` AND (t.company_id = ? OR u.company_id = ?)`;
    values.push(companyId, companyId);
  }
  const [rows] = await pool.query(query, values);
  if (!rows[0]) return null;
  const tasks = await attachUsersToTasks([serializeTask(rows[0])]);
  return tasks[0] || null;
}

/**
 * ============================================================================
 * HELPER: formatMins
 * ============================================================================
 * Formats minutes into human-readable format like '1h 30m'.
 * @param {number} m - Minutes
 * @returns {string} Formatted string
 */
function formatMins(m) {
  const mins = Number(m) || 0;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours > 0 && rem > 0) return `${hours}h ${rem < 10 ? '0' : ''}${rem}m`;
  if (hours > 0) return `${hours}h 00m`;
  return `${rem}m`;
}

/**
 * ============================================================================
 * HELPER: syncTimesheetForTask
 * ============================================================================
 * Synchronizes spent minutes on a task with the user's timesheet table entries.
 *
 * @param {Object} task - Task object
 */
async function syncTimesheetForTask(task) {
  if (!task || !task.spentMinutes || task.spentMinutes <= 0) return;
  const timeStr = formatMins(task.spentMinutes);

  let projName = 'General Workspace';
  if (task.projectId) {
    const [p] = await pool.query('SELECT title FROM projects WHERE id = ?', [task.projectId]);
    if (p[0]?.title) projName = p[0].title;
  }

  const targetUsers = Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0
    ? task.assigneeIds
    : (task.userId ? [task.userId] : []);

  for (const uid of targetUsers) {
    if (!uid) continue;
    const [existing] = await pool.query('SELECT id FROM timesheets WHERE user_id = ? AND title = ? LIMIT 1', [uid, task.title]);
    if (existing.length > 0) {
      await pool.execute('UPDATE timesheets SET time = ?, project = ?, description = ? WHERE id = ?', [timeStr, projName, task.description || '', existing[0].id]);
    } else {
      await pool.execute('INSERT INTO timesheets (user_id, title, description, task, project, time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uid, task.title, task.description || '', task.category || 'General', projName, timeStr, new Date()]);
    }
  }
}

/**
 * ============================================================================
 * FUNCTION: create
 * ============================================================================
 * Creates a new task in the database, resolving the matching status stage and ID.
 *
 * @param {number} userId - Creator user ID
 * @param {Object} input - Task details
 * @param {number|null} companyId - Company ID
 * @returns {Promise<Object>} Created task object
 */
async function create(userId, input, companyId = null) {
  const resolvedStage = await resolveStatusStage(companyId, input.status, input.statusId);
  const folderName = `user-${userId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const normalizedInput = { ...input, attachments: persistAttachments(input.attachments, folderName) };
  const values = taskValues(normalizedInput, resolvedStage, userId);
  const statusName = resolvedStage ? resolvedStage.name : (input.status || 'To Do');

  const formTemplateId = input.formTemplateId != null && input.formTemplateId !== ''
    ? Number(input.formTemplateId)
    : null;

  const [result] = await pool.execute(
    'INSERT INTO tasks (user_id, company_id, project_id, form_template_id, title, description, completed, status, status_id, priority, due_date, due_time, estimated_minutes, spent_minutes, category, tags, attachments, assignee_ids, custom_fields, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [values[0], companyId, values[1], formTemplateId, values[2], values[3], values[4], statusName, values[5], values[6], values[7], values[8], values[9], values[10], values[11], values[12], values[13], values[14], input.customFields && typeof input.customFields === 'object' ? JSON.stringify(input.customFields) : null, new Date()]
  );
  const createdTask = await findById(userId, result.insertId, true, companyId, true);
  if (createdTask) await syncTimesheetForTask(createdTask);
  return createdTask;
}

/**
 * ============================================================================
 * FUNCTION: update
 * ============================================================================
 * Updates an existing task by ID, synchronizing both status_id and status string.
 *
 * @param {number} userId - Requesting user ID
 * @param {number} id - Task ID to update
 * @param {Object} input - Updated task fields
 * @param {boolean} isAdmin - Whether user is company admin
 * @param {number|null} companyId - User's company ID
 * @param {boolean} isSuperAdmin - Whether user is super admin
 * @returns {Promise<Object|null>} Updated task object or null
 */
async function update(userId, id, input, isAdmin = false, companyId = null, isSuperAdmin = false) {
  const existing = await findById(userId, id, true, companyId, isSuperAdmin);
  if (!existing) return null;
  const isCreator = Number(existing.userId) === Number(userId);
  const isAssignee = Array.isArray(existing.assigneeIds) && existing.assigneeIds.includes(Number(userId));
  if (!isAdmin && !isCreator && !isAssignee && !isSuperAdmin) {
    return null;
  }

  const effectiveCompanyId = companyId || existing.companyId || null;
  const resolvedStage = await resolveStatusStage(effectiveCompanyId, input.status ?? existing.status, input.statusId ?? existing.statusId);

  const normalizedInput = { ...input, attachments: persistAttachments(input.attachments, `task-${id}`) };
  const creatorIdToKeep = existing.userId ?? userId;
  const values = taskValues(normalizedInput, resolvedStage, creatorIdToKeep);
  const statusName = resolvedStage ? resolvedStage.name : (input.status || existing.status || 'To Do');

  const formTemplateIdVal = input.formTemplateId !== undefined
    ? (input.formTemplateId != null && input.formTemplateId !== '' ? Number(input.formTemplateId) : null)
    : (existing.formTemplateId ?? null);

  const query = 'UPDATE tasks SET user_id = ?, project_id = ?, form_template_id = ?, title = ?, description = ?, completed = ?, status = ?, status_id = ?, priority = ?, due_date = ?, due_time = ?, estimated_minutes = ?, spent_minutes = ?, category = ?, tags = ?, attachments = ?, assignee_ids = ?, custom_fields = ? WHERE id = ?';

  const customFieldsVal = input.customFields !== undefined ? (input.customFields && typeof input.customFields === 'object' ? JSON.stringify(input.customFields) : null) : (existing.customFields ? JSON.stringify(existing.customFields) : null);
  await pool.execute(query, [values[0], values[1], formTemplateIdVal, values[2], values[3], values[4], statusName, values[5], values[6], values[7], values[8], values[9], values[10], values[11], values[12], values[13], values[14], customFieldsVal, id]);
  const updatedTask = await findById(userId, id, true, companyId, isSuperAdmin);
  if (updatedTask) await syncTimesheetForTask(updatedTask);
  return updatedTask;
}

/**
 * ============================================================================
 * FUNCTION: toggle
 * ============================================================================
 * Toggles a task between completed and open state.
 * Dynamically updates status_id and status string to the company's designated
 * completed stage (is_completed = 1) or initial starting stage (is_initial = 1).
 *
 * @param {number} userId - Requesting user ID
 * @param {number} id - Task ID to toggle
 * @param {boolean} isAdmin - Whether user is admin
 * @param {number|null} companyId - Company ID
 * @param {boolean} isSuperAdmin - Whether user is super admin
 * @returns {Promise<Object|null>} Updated task or null
 */
async function toggle(userId, id, isAdmin = false, companyId = null, isSuperAdmin = false) {
  const existing = await findById(userId, id, true, companyId, isSuperAdmin);
  if (!existing) return null;
  const isCreator = Number(existing.userId) === Number(userId);
  const isAssignee = Array.isArray(existing.assigneeIds) && existing.assigneeIds.includes(Number(userId));
  if (!isAdmin && !isCreator && !isAssignee && !isSuperAdmin) {
    return null;
  }

  const effectiveCompanyId = companyId || existing.companyId || null;
  const nextCompleted = !existing.completed;
  
  // Find the company's designated completed stage or initial starting stage dynamically
  const stages = await ensureDefaultCompanyStatuses(effectiveCompanyId);

  let targetStage = null;
  if (nextCompleted) {
    targetStage = stages.find((s) => Boolean(s.is_completed)) || null;
  } else {
    targetStage = stages.find((s) => Boolean(s.is_initial)) || null;
  }

  const newStatusId = targetStage ? Number(targetStage.id) : existing.statusId;
  const newStatusName = targetStage ? targetStage.name : (nextCompleted ? 'Done' : 'To Do');

  const query = 'UPDATE tasks SET completed = ?, status = ?, status_id = ? WHERE id = ?';
  await pool.execute(query, [nextCompleted, newStatusName, newStatusId, id]);
  return findById(userId, id, true, companyId, isSuperAdmin);
}

/**
 * ============================================================================
 * FUNCTION: remove
 * ============================================================================
 * Deletes a task by ID, taking permissions and company tenancy into account.
 *
 * @param {number} userId - Requesting user ID
 * @param {number} id - Task ID to delete
 * @param {boolean} isAdmin - Whether user is company admin
 * @param {number|null} companyId - Company ID
 * @param {boolean} isSuperAdmin - Whether user is super admin
 * @returns {Promise<boolean>} True if task was deleted
 */
async function remove(userId, id, isAdmin = false, companyId = null, isSuperAdmin = false) {
  let query;
  let values;
  if (isSuperAdmin) {
    query = 'DELETE FROM tasks WHERE id = ?';
    values = [id];
  } else if (isAdmin && companyId) {
    query = 'DELETE t FROM tasks t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ? AND (t.company_id = ? OR u.company_id = ?)';
    values = [id, companyId, companyId];
  } else {
    query = 'DELETE FROM tasks WHERE id = ? AND user_id = ?';
    values = [id, userId];
  }
  const [result] = await pool.execute(query, values);
  return result.affectedRows > 0;
}

/**
 * ============================================================================
 * FUNCTION: clearCompleted
 * ============================================================================
 * Clears/deletes all completed tasks within user or company scope.
 *
 * @param {number} userId - Requesting user ID
 * @param {boolean} isAdmin - Whether user is company admin
 * @param {number|null} companyId - Company ID
 * @param {boolean} isSuperAdmin - Whether user is super admin
 * @returns {Promise<number>} Number of deleted tasks
 */
async function clearCompleted(userId, isAdmin = false, companyId = null, isSuperAdmin = false) {
  let query;
  let values;
  if (isSuperAdmin) {
    query = 'DELETE FROM tasks WHERE completed = TRUE';
    values = [];
  } else if (isAdmin && companyId) {
    query = 'DELETE t FROM tasks t LEFT JOIN users u ON u.id = t.user_id WHERE t.completed = TRUE AND (t.company_id = ? OR u.company_id = ?)';
    values = [companyId, companyId];
  } else {
    query = 'DELETE FROM tasks WHERE completed = TRUE AND user_id = ?';
    values = [userId];
  }
  const [result] = await pool.execute(query, values);
  return result.affectedRows;
}

/**
 * ============================================================================
 * FUNCTION: countTasksWithStatus
 * ============================================================================
 * Counts active tasks assigned to a specific status (by numeric status_id or
 * stage name). Used to prevent deleting a status that is currently in use.
 *
 * @param {number|null} companyId - Company ID
 * @param {string|number} statusIdentifier - Status ID or stage display name
 * @returns {Promise<number>} Number of active tasks using this status
 */
async function countTasksWithStatus(companyId, statusIdentifier) {
  const targetCompanyId = Number(companyId) || 0;
  if (!statusIdentifier) return 0;
  const isNumeric = /^\d+$/.test(String(statusIdentifier).trim());
  const [rows] = await pool.query(
    `SELECT COUNT(*) as taskCount 
     FROM tasks t 
     LEFT JOIN task_statuses ts ON ts.id = t.status_id 
     WHERE (t.company_id = ? OR t.user_id IN (SELECT id FROM users WHERE company_id = ?)) 
       AND (ts.name = ? ${isNumeric ? 'OR t.status_id = ?' : ''})`,
    isNumeric 
      ? [targetCompanyId, targetCompanyId, statusIdentifier, Number(statusIdentifier)]
      : [targetCompanyId, targetCompanyId, statusIdentifier]
  );
  return Number(rows[0]?.taskCount) || 0;
}

/**
 * ============================================================================
 * FUNCTION: getStatuses
 * ============================================================================
 * Retrieves the ordered list of status pipeline stages configured for a company.
 *
 * @param {number|null} companyId - Company ID
 * @returns {Promise<Array<Object>>} List of task status objects
 */
async function getStatuses(companyId = null) {
  const targetCompanyId = Number(companyId) || 0;
  
  if (targetCompanyId > 0) {
    const rows = await ensureDefaultCompanyStatuses(targetCompanyId);
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: Number(r.id),
        companyId: Number(r.company_id || targetCompanyId),
        name: r.name,
        color: r.color,
        sortOrder: Number(r.sort_order || r.sortOrder || 1),
        isInitial: Boolean(r.is_initial || r.isInitial),
        isCompleted: Boolean(r.is_completed || r.isCompleted),
        isDefault: Boolean(r.is_default || r.isDefault)
      }));
    }
  }

  return [];
}

/**
 * ============================================================================
 * FUNCTION: updateStatuses
 * ============================================================================
 * Updates, reorders, creates, or deletes status stages for a company pipeline.
 * Performs safety check to block deleting stages in use by tasks.
 * Automatically propagates new stage names and status_id to affected tasks.
 *
 * @param {number|null} companyId - Company ID
 * @param {Array<Object>} statuses - Incoming updated list of status stages
 * @returns {Promise<Array<Object>>} Refreshed statuses list
 */
async function updateStatuses(companyId = null, statuses = []) {
  const targetCompanyId = Number(companyId) || 0;
  if (!Array.isArray(statuses)) return getStatuses(targetCompanyId);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch current statuses for this company
    const [existingRows] = await connection.query(
      'SELECT id, name FROM task_statuses WHERE company_id = ?',
      [targetCompanyId]
    );
    const existingById = new Map();
    const existingByName = new Map();
    for (const row of existingRows) {
      if (row.id) existingById.set(Number(row.id), row);
      if (row.name) existingByName.set(row.name.toLowerCase(), row);
    }

    const incomingNames = new Set(statuses.map((s) => String(s.name || '').trim().toLowerCase()));

    // 2. SAFETY CHECK: Check if any status being deleted has active tasks
    for (const existing of existingRows) {
      const isRetained = incomingNames.has(existing.name.toLowerCase());

      if (!isRetained && targetCompanyId > 0) {
        const [taskRows] = await connection.query(
          'SELECT COUNT(*) as taskCount FROM tasks WHERE (company_id = ? OR user_id IN (SELECT id FROM users WHERE company_id = ?)) AND status_id = ?',
          [targetCompanyId, targetCompanyId, existing.id]
        );
        const count = Number(taskRows[0]?.taskCount) || 0;
        if (count > 0) {
          const err = new Error(
            `Cannot delete status stage "${existing.name}". There are currently ${count} task(s) assigned to this stage. Please reassign or update these tasks before deleting this status stage.`
          );
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // 3. Update existing stages or insert new ones (preserving existing IDs)
    const retainedIds = new Set();
    const updatedStages = []; // { id, name, oldName }

    for (let index = 0; index < statuses.length; index++) {
      const st = statuses[index];
      const name = String(st.name || '').trim();
      const color = st.color || '#2563eb';
      const sortOrder = Number(st.sortOrder) || (index + 1);
      const isInitial = Boolean(st.isInitial);
      const isCompleted = Boolean(st.isCompleted);
      const isDefault = false;

      // Check if existing by ID or previous name
      let matchedExisting = null;
      if (st.id && existingById.has(Number(st.id))) {
        matchedExisting = existingById.get(Number(st.id));
      } else if (existingByName.has(name.toLowerCase())) {
        matchedExisting = existingByName.get(name.toLowerCase());
      } else if (st.oldName && existingByName.has(String(st.oldName).toLowerCase())) {
        matchedExisting = existingByName.get(String(st.oldName).toLowerCase());
      }

      if (matchedExisting) {
        const existingId = Number(matchedExisting.id);
        const oldName = matchedExisting.name;
        retainedIds.add(existingId);
        await connection.execute(
          'UPDATE task_statuses SET name = ?, color = ?, sort_order = ?, is_initial = ?, is_completed = ?, is_default = ? WHERE id = ?',
          [name, color, sortOrder, isInitial, isCompleted, isDefault, existingId]
        );
        updatedStages.push({ id: existingId, name, oldName });
      } else {
        const [insertRes] = await connection.execute(
          'INSERT INTO task_statuses (company_id, name, color, sort_order, is_initial, is_completed, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [targetCompanyId, name, color, sortOrder, isInitial, isCompleted, isDefault]
        );
        retainedIds.add(insertRes.insertId);
        updatedStages.push({ id: insertRes.insertId, name, oldName: null });
      }
    }

    // Delete stages that are no longer present for this company
    for (const existing of existingRows) {
      if (!retainedIds.has(Number(existing.id))) {
        await connection.execute('DELETE FROM task_statuses WHERE id = ?', [existing.id]);
      }
    }

    // 4. Update tasks in this company with the new status IDs (leaving status column untouched)
    for (const st of updatedStages) {
      if (targetCompanyId > 0) {
        await connection.execute(
          `UPDATE tasks 
           SET status_id = ? 
           WHERE (company_id = ? OR user_id IN (SELECT id FROM users WHERE company_id = ?)) 
             AND status_id = ?`,
          [st.id, targetCompanyId, targetCompanyId, st.id]
        );
      }
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return getStatuses(targetCompanyId);
}

/**
 * ============================================================================
 * FUNCTION: getStatusTemplates
 * ============================================================================
 * Retrieves pipeline status templates grouped by company or system default.
 *
 * @param {number|null} requestCompanyId - Optional company ID filter
 * @returns {Promise<Array<Object>>} List of template objects
 */
async function getStatusTemplates(requestCompanyId = null) {
  const targetCompanyId = Number(requestCompanyId) || 0;

  let query = 'SELECT DISTINCT ts.company_id, COALESCE(c.name, "System Default") as company_name FROM task_statuses ts LEFT JOIN companies c ON c.id = ts.company_id';
  const params = [];

  if (targetCompanyId > 0) {
    query += ' WHERE ts.company_id = ?';
    params.push(targetCompanyId);
  }
  query += ' ORDER BY ts.company_id ASC';

  const [compRows] = await pool.query(query, params);

  const templates = [];
  for (const c of compRows) {
    const cId = Number(c.company_id);
    const [rows] = await pool.query(
      'SELECT id, company_id as companyId, name, color, sort_order as sortOrder, is_initial as isInitial, is_completed as isCompleted, is_default as isDefault FROM task_statuses WHERE company_id = ? ORDER BY sort_order ASC, id ASC',
      [cId]
    );

    if (rows && rows.length > 0) {
      templates.push({
        id: cId,
        name: cId === 0 ? 'System Default Pipeline' : `${c.company_name} Pipeline`,
        description: cId === 0 ? 'Default system pipeline (company_id: 0)' : `Custom pipeline for ${c.company_name}`,
        isSystem: cId === 0,
        statuses: rows.map((r) => ({
          ...r,
          id: Number(r.id),
          sortOrder: Number(r.sortOrder),
          isInitial: Boolean(r.isInitial),
          isCompleted: Boolean(r.isCompleted),
          isDefault: Boolean(r.isDefault)
        }))
      });
    }
  }

  return templates;
}

/**
 * ============================================================================
 * FUNCTION: saveStatusTemplate
 * ============================================================================
 * Saves a company status template by updating the company's status records.
 *
 * @param {string} name - Template name
 * @param {string} description - Template description
 * @param {Array<Object>} statuses - Status list
 * @param {number} companyId - Target company ID
 * @returns {Promise<Array<Object>>} Updated statuses
 */
async function saveStatusTemplate(name, description, statuses = [], companyId = 0) {
  return updateStatuses(companyId, statuses);
}

/**
 * ============================================================================
 * FUNCTION: deleteStatusTemplate
 * ============================================================================
 * Deletes a status template for a company (cannot delete system default 0).
 *
 * @param {number} id - Target company template ID
 * @param {number} companyId - Fallback company ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteStatusTemplate(id, companyId = 0) {
  const targetId = Number(id) || Number(companyId) || 0;
  if (targetId === 0) return false;
  
  await pool.execute('DELETE FROM task_statuses WHERE company_id = ?', [targetId]);
  return true;
}

/**
 * ============================================================================
 * FUNCTION: checkConnection
 * ============================================================================
 * Pings database connection pool on startup to verify connectivity.
 */
async function checkConnection() {
  await pool.query('SELECT 1');
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  toggle,
  remove,
  clearCompleted,
  checkConnection,
  serializeTask,
  persistAttachments,
  getStatuses,
  updateStatuses,
  countTasksWithStatus,
  getStatusTemplates,
  saveStatusTemplate,
  deleteStatusTemplate,
  ensureDefaultCompanyStatuses
};





