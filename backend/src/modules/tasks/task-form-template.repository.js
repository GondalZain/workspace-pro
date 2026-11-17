// @ts-nocheck
const { pool } = require('../../config/database');

const DEFAULT_STANDARD_CONFIG = {
  description: { enabled: true, required: false },
  project: { enabled: true, required: true },
  status: { enabled: true, required: false },
  priority: { enabled: true, required: false },
  assignees: { enabled: true, required: false },
  dueDate: { enabled: true, required: false },
  dueTime: { enabled: true, required: false },
  estimatedTime: { enabled: true, required: false },
  category: { enabled: true, required: false },
  tags: { enabled: true, required: false },
  attachments: { enabled: true, required: false }
};

function parseFieldsConfig(raw) {
  if (!raw) return { sectionTitle: '', standardFields: { ...DEFAULT_STANDARD_CONFIG }, customFields: [] };
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return {
      sectionTitle: typeof parsed.sectionTitle === 'string' ? parsed.sectionTitle : '',
      standardFields: { ...DEFAULT_STANDARD_CONFIG, ...(parsed.standardFields || {}) },
      customFields: Array.isArray(parsed.customFields) ? parsed.customFields : []
    };
  } catch {
    return { sectionTitle: '', standardFields: { ...DEFAULT_STANDARD_CONFIG }, customFields: [] };
  }
}

function serializeTemplate(row) {
  if (!row) return null;
  const projectIds = row.assigned_project_ids
    ? String(row.assigned_project_ids)
        .split(',')
        .map(Number)
        .filter((id) => !isNaN(id))
    : [];
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    isDefault: Boolean(row.is_default),
    targetEntity: row.target_entity || 'task',
    assignedProjectIds: projectIds,
    assignedProjectCount: row.assigned_project_count != null ? Number(row.assigned_project_count) : projectIds.length,
    fieldsConfig: parseFieldsConfig(row.fields_config),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listByCompany(companyId, isSuperAdmin = false) {
  let query = `
    SELECT t.*, 
       GROUP_CONCAT(p.id) AS assigned_project_ids,
       COUNT(p.id) AS assigned_project_count
     FROM task_form_templates t
     LEFT JOIN projects p ON p.form_template_id = t.id
  `;
  const values = [];
  if (companyId && !isSuperAdmin) {
    query += ` WHERE t.company_id = ? AND t.deleted_at IS NULL`;
    values.push(Number(companyId));
  } else {
    query += ` WHERE t.deleted_at IS NULL`;
  }
  query += ` GROUP BY t.id ORDER BY t.is_default DESC, t.name ASC`;
  const [rows] = await pool.query(query, values);
  return rows.map(serializeTemplate);
}

async function findById(id, companyId, isSuperAdmin = false) {
  let query = `
    SELECT t.*, 
       GROUP_CONCAT(p.id) AS assigned_project_ids,
       COUNT(p.id) AS assigned_project_count
     FROM task_form_templates t
     LEFT JOIN projects p ON p.form_template_id = t.id
  `;
  const values = [Number(id)];
  if (companyId && !isSuperAdmin) {
    query += ` WHERE t.id = ? AND t.company_id = ? AND t.deleted_at IS NULL`;
    values.push(Number(companyId));
  } else {
    query += ` WHERE t.id = ? AND t.deleted_at IS NULL`;
  }
  query += ` GROUP BY t.id LIMIT 1`;
  const [rows] = await pool.query(query, values);
  return rows.length > 0 ? serializeTemplate(rows[0]) : null;
}

async function getDefaultByCompany(companyId, isSuperAdmin = false) {
  let query = `
    SELECT t.*, 
       GROUP_CONCAT(p.id) AS assigned_project_ids,
       COUNT(p.id) AS assigned_project_count
     FROM task_form_templates t
     LEFT JOIN projects p ON p.form_template_id = t.id
  `;
  const values = [];
  if (companyId && !isSuperAdmin) {
    query += ` WHERE t.company_id = ? AND t.is_default = 1 AND t.deleted_at IS NULL`;
    values.push(Number(companyId));
  } else {
    query += ` WHERE t.is_default = 1 AND t.deleted_at IS NULL`;
  }
  query += ` GROUP BY t.id LIMIT 1`;
  const [rows] = await pool.query(query, values);
  if (rows.length > 0) return serializeTemplate(rows[0]);

  // Fallback to the first available active template
  const [fallback] = await pool.query(
    `SELECT t.*, 
       GROUP_CONCAT(p.id) AS assigned_project_ids,
       COUNT(p.id) AS assigned_project_count
     FROM task_form_templates t
     LEFT JOIN projects p ON p.form_template_id = t.id
     WHERE t.deleted_at IS NULL 
     GROUP BY t.id
     ORDER BY t.id ASC LIMIT 1`
  );
  return fallback.length > 0 ? serializeTemplate(fallback[0]) : null;
}

async function syncProjectAssignments(templateId, companyId, data) {
  if (data.applyToAllProjects === true) {
    await pool.query(
      `UPDATE projects SET form_template_id = ? WHERE company_id = ?`,
      [Number(templateId), Number(companyId)]
    );
  } else if (Array.isArray(data.assignedProjectIds)) {
    const validIds = data.assignedProjectIds.map(Number).filter((id) => !isNaN(id));
    if (validIds.length > 0) {
      const placeholders = validIds.map(() => '?').join(',');
      // Unassign projects previously using this template that are no longer selected
      await pool.query(
        `UPDATE projects SET form_template_id = NULL 
         WHERE company_id = ? AND form_template_id = ? AND id NOT IN (${placeholders})`,
        [Number(companyId), Number(templateId), ...validIds]
      );
      // Assign selected projects to this template
      await pool.query(
        `UPDATE projects SET form_template_id = ? 
         WHERE company_id = ? AND id IN (${placeholders})`,
        [Number(templateId), Number(companyId), ...validIds]
      );
    } else {
      // Unassign all projects from this template
      await pool.query(
        `UPDATE projects SET form_template_id = NULL 
         WHERE company_id = ? AND form_template_id = ?`,
        [Number(companyId), Number(templateId)]
      );
    }
  }
}

async function create(companyId, data) {
  const name = String(data.name || '').trim();
  const description = data.description ? String(data.description).trim() : null;
  const isDefault = Boolean(data.isDefault);
  const targetEntity = data.targetEntity === 'project' ? 'project' : 'task';
  const fieldsConfig = data.fieldsConfig && typeof data.fieldsConfig === 'object'
    ? JSON.stringify(data.fieldsConfig)
    : JSON.stringify({ standardFields: DEFAULT_STANDARD_CONFIG, customFields: [] });

  // If marked as default, unset other defaults for this company & target_entity
  if (isDefault) {
    await pool.query(
      `UPDATE task_form_templates SET is_default = 0 WHERE company_id = ? AND target_entity = ?`,
      [Number(companyId), targetEntity]
    );
  }

  const [result] = await pool.query(
    `INSERT INTO task_form_templates (company_id, name, description, is_default, target_entity, fields_config)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [Number(companyId), name, description, isDefault ? 1 : 0, targetEntity, fieldsConfig]
  );

  const newId = result.insertId;
  await syncProjectAssignments(newId, companyId, data);

  return findById(newId, companyId);
}

async function update(id, companyId, data) {
  const existing = await findById(id, companyId);
  if (!existing) return null;

  const name = data.name !== undefined ? String(data.name).trim() : existing.name;
  const description = data.description !== undefined ? (data.description ? String(data.description).trim() : null) : existing.description;
  const isDefault = data.isDefault !== undefined ? Boolean(data.isDefault) : existing.isDefault;
  const targetEntity = data.targetEntity !== undefined
    ? (data.targetEntity === 'project' ? 'project' : 'task')
    : existing.targetEntity;
  const fieldsConfig = data.fieldsConfig !== undefined
    ? JSON.stringify(data.fieldsConfig)
    : JSON.stringify(existing.fieldsConfig);

  if (isDefault && !existing.isDefault) {
    await pool.query(
      `UPDATE task_form_templates SET is_default = 0 WHERE company_id = ? AND target_entity = ?`,
      [Number(companyId), targetEntity]
    );
  }

  await pool.query(
    `UPDATE task_form_templates 
     SET name = ?, description = ?, is_default = ?, target_entity = ?, fields_config = ? 
     WHERE id = ? AND company_id = ?`,
    [name, description, isDefault ? 1 : 0, targetEntity, fieldsConfig, Number(id), Number(companyId)]
  );

  await syncProjectAssignments(id, companyId, data);

  return findById(id, companyId);
}

async function softDelete(id, companyId) {
  const existing = await findById(id, companyId);
  if (!existing) return false;

  await pool.query(
    `UPDATE task_form_templates SET deleted_at = NOW() WHERE id = ? AND company_id = ?`,
    [Number(id), Number(companyId)]
  );

  // If the deleted one was default, make the oldest active template default
  if (existing.isDefault) {
    const [remaining] = await pool.query(
      `SELECT id FROM task_form_templates 
       WHERE company_id = ? AND deleted_at IS NULL 
       ORDER BY id ASC LIMIT 1`,
      [Number(companyId)]
    );
    if (remaining.length > 0) {
      await pool.query(
        `UPDATE task_form_templates SET is_default = 1 WHERE id = ?`,
        [remaining[0].id]
      );
    }
  }

  return true;
}

async function assignProjects(companyId, templateId, projectIds, isSuperAdmin = false) {
  const targetTemplateId = templateId ? Number(templateId) : null;
  const validIds = Array.isArray(projectIds) ? projectIds.map(Number).filter((id) => !isNaN(id)) : [];
  if (validIds.length === 0) return true;

  const placeholders = validIds.map(() => '?').join(',');
  if (companyId && !isSuperAdmin) {
    await pool.query(
      `UPDATE projects SET form_template_id = ? 
       WHERE company_id = ? AND id IN (${placeholders})`,
      [targetTemplateId, Number(companyId), ...validIds]
    );
  } else {
    await pool.query(
      `UPDATE projects SET form_template_id = ? 
       WHERE id IN (${placeholders})`,
      [targetTemplateId, ...validIds]
    );
  }
  return true;
}

async function assignTasks(companyId, templateId, taskIds, isSuperAdmin = false) {
  const targetTemplateId = templateId ? Number(templateId) : null;
  const validIds = Array.isArray(taskIds) ? taskIds.map(Number).filter((id) => !isNaN(id)) : [];
  if (validIds.length === 0) return true;

  const placeholders = validIds.map(() => '?').join(',');
  if (companyId && !isSuperAdmin) {
    await pool.query(
      `UPDATE tasks SET form_template_id = ? 
       WHERE company_id = ? AND id IN (${placeholders})`,
      [targetTemplateId, Number(companyId), ...validIds]
    );
  } else {
    await pool.query(
      `UPDATE tasks SET form_template_id = ? 
       WHERE id IN (${placeholders})`,
      [targetTemplateId, ...validIds]
    );
  }
  return true;
}

module.exports = {
  DEFAULT_STANDARD_CONFIG,
  listByCompany,
  findById,
  getDefaultByCompany,
  create,
  update,
  softDelete,
  assignProjects,
  assignTasks
};

