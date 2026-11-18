// @ts-nocheck
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../../config/database');

const PROJECT_UPLOADS_ROOT = path.join(__dirname, '../../../uploads/projects');
try { fs.mkdirSync(PROJECT_UPLOADS_ROOT, { recursive: true }); } catch {}

function getExtensionFromMime(mimeType) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
  };
  return map[mimeType] || '.png';
}

function sanitizeFileName(name, fallback) {
  const safeName = String(name || fallback)
    .replace(/[\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9_.-]+/g, '-')
    .trim();

  return safeName || fallback;
}

function persistProjectImage(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return null;
  if (imagePath.startsWith('/uploads/') || /^https?:\/\//i.test(imagePath)) return imagePath;
  if (!imagePath.startsWith('data:')) return imagePath;

  const match = imagePath.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return imagePath;

  try {
    const mimeType = match[1] || 'image/png';
    const extension = getExtensionFromMime(mimeType);
    const folderName = `project-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const folderPath = path.join(PROJECT_UPLOADS_ROOT, folderName);
    fs.mkdirSync(folderPath, { recursive: true });

    const fileName = `${sanitizeFileName('project-image', 'project-image')}-${Date.now()}${extension}`;
    const filePath = path.join(folderPath, fileName);
    const buffer = Buffer.from(match[2], 'base64');
    fs.writeFileSync(filePath, buffer);

    return `/uploads/projects/${folderName}/${fileName}`;
  } catch (fsErr) {
    // In serverless / read-only environments (e.g. Vercel), preserve the data URL directly without crashing
    console.warn('[ProjectRepository] Serverless read-only filesystem detected, storing image directly:', fsErr.message);
    return imagePath;
  }
}

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

function serializeProject(row) {
  return {
    id: Number(row.id),
    userId: row.user_id !== null && row.user_id !== undefined ? Number(row.user_id) : null,
    defaultAssigneeId: row.default_assignee_id !== null && row.default_assignee_id !== undefined ? Number(row.default_assignee_id) : null,
    formTemplateId: row.form_template_id !== null && row.form_template_id !== undefined ? Number(row.form_template_id) : null,
    creatorUsername: row.creator_username || null,
    title: row.title,
    description: row.description || '',
    imagePath: row.image_path || null,
    customFields: parseCustomFields(row.custom_fields),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

async function findAll(userId, companyId = null, isSuperAdmin = false) {
  let query = `
    SELECT p.*, u.username AS creator_username
    FROM projects p
    LEFT JOIN users u ON u.id = p.user_id
  `;
  const values = [];
  if (!isSuperAdmin && companyId) {
    query += ` WHERE (p.company_id = ? OR u.company_id = ? OR p.user_id = ?)`;
    values.push(companyId, companyId, userId);
  } else if (!isSuperAdmin) {
    query += ` WHERE p.user_id = ?`;
    values.push(userId);
  }
  query += ` ORDER BY p.created_at DESC`;

  const [rows] = await pool.execute(query, values);
  return rows.map(serializeProject);
}

async function findById(userId, id, companyId = null, isSuperAdmin = false) {
  let query = `
    SELECT p.*, u.username AS creator_username
    FROM projects p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `;
  const values = [id];
  if (!isSuperAdmin && companyId) {
    query += ` AND (p.company_id = ? OR u.company_id = ? OR p.user_id = ?)`;
    values.push(companyId, companyId, userId);
  } else if (!isSuperAdmin) {
    query += ` AND p.user_id = ?`;
    values.push(userId);
  }

  const [rows] = await pool.execute(query, values);
  return rows[0] ? serializeProject(rows[0]) : null;
}

async function create(userId, input = {}, companyId = null) {
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();

  if (!title) {
    const error = new Error('Project title is required.');
    error.statusCode = 400;
    throw error;
  }

  const defaultAssigneeId = input.defaultAssigneeId ? Number(input.defaultAssigneeId) : null;
  const formTemplateId = input.formTemplateId ? Number(input.formTemplateId) : null;
  const imagePath = persistProjectImage(input.imagePath || input.image || null);
  const customFields = input.customFields ? (typeof input.customFields === 'string' ? input.customFields : JSON.stringify(input.customFields)) : null;
  const [result] = await pool.execute(
    'INSERT INTO projects (user_id, company_id, title, description, image_path, default_assignee_id, form_template_id, custom_fields, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, companyId, title, description, imagePath || null, defaultAssigneeId, formTemplateId, customFields, new Date()]
  );

  return findById(userId, result.insertId, companyId, true);
}

async function update(userId, id, input = {}, companyId = null, isSuperAdmin = false) {
  const existing = await findById(userId, id, companyId, isSuperAdmin);
  if (!existing) return null;

  const title = String(input.title ?? existing.title).trim();
  if (!title) {
    const error = new Error('Project title is required.');
    error.statusCode = 400;
    throw error;
  }

  const description = String(input.description ?? existing.description ?? '').trim();
  const imagePath = input.imagePath !== undefined || input.image !== undefined
    ? persistProjectImage(input.imagePath ?? input.image ?? null)
    : existing.imagePath;

  const defaultAssigneeId = input.defaultAssigneeId !== undefined
    ? (input.defaultAssigneeId ? Number(input.defaultAssigneeId) : null)
    : (existing.defaultAssigneeId || null);

  const formTemplateId = input.formTemplateId !== undefined
    ? (input.formTemplateId ? Number(input.formTemplateId) : null)
    : (existing.formTemplateId || null);

  const customFields = input.customFields !== undefined
    ? (input.customFields && typeof input.customFields === 'object' ? JSON.stringify(input.customFields) : null)
    : (existing.customFields ? JSON.stringify(existing.customFields) : null);

  await pool.execute(
    'UPDATE projects SET title = ?, description = ?, image_path = ?, default_assignee_id = ?, form_template_id = ?, custom_fields = ? WHERE id = ?',
    [title, description, imagePath || null, defaultAssigneeId, formTemplateId, customFields, id]
  );

  return findById(userId, id, companyId, isSuperAdmin);
}

async function deleteProject(userId, id, companyId = null, isSuperAdmin = false) {
  const existing = await findById(userId, id, companyId, isSuperAdmin);
  if (!existing) return false;

  const [result] = await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function listAll(companyId = null, isSuperAdmin = false) {
  return findAll(null, companyId, isSuperAdmin);
}

module.exports = { findAll, findById, create, update, delete: deleteProject, listAll, serializeProject, persistProjectImage };
