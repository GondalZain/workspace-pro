const { pool } = require('../../config/database');

/**
 * Safely parses options JSON array
 */
function parseOptions(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeField(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    entityType: row.entity_type,
    fieldKey: row.field_key,
    fieldName: row.field_name,
    fieldType: row.field_type,
    options: parseOptions(row.options),
    placeholder: row.placeholder || '',
    description: row.description || '',
    isRequired: Boolean(row.is_required),
    orderIndex: Number(row.order_index || 0),
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    deletedAt: row.deleted_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * List custom fields for a specific company and entity_type ('project' | 'task')
 * By default only returns active fields. If includeInactive is true, returns all.
 */
async function listFields(companyId, entityType, includeInactive = false) {
  let query = 'SELECT * FROM custom_field_definitions WHERE company_id = ?';
  const params = [companyId];

  if (!includeInactive) {
    query += ' AND (is_active = 1 OR is_active IS NULL)';
  }

  if (entityType) {
    query += ' AND entity_type = ?';
    params.push(entityType);
  }

  query += ' ORDER BY order_index ASC, id ASC';

  const [rows] = await pool.execute(query, params);
  return rows.map(serializeField);
}

async function findById(id, companyId) {
  const [rows] = await pool.execute(
    'SELECT * FROM custom_field_definitions WHERE id = ? AND company_id = ?',
    [id, companyId]
  );
  return serializeField(rows[0]);
}

async function findByKey(companyId, entityType, fieldKey, includeInactive = false) {
  let query = 'SELECT * FROM custom_field_definitions WHERE company_id = ? AND entity_type = ? AND field_key = ?';
  if (!includeInactive) {
    query += ' AND (is_active = 1 OR is_active IS NULL)';
  }
  const [rows] = await pool.execute(query, [companyId, entityType, fieldKey]);
  return serializeField(rows[0]);
}

async function createField(companyId, data) {
  const {
    entityType,
    fieldKey,
    fieldName,
    fieldType = 'text',
    options = [],
    placeholder = '',
    description = '',
    isRequired = false,
    orderIndex = 0
  } = data;

  const optionsJson = Array.isArray(options) ? JSON.stringify(options) : JSON.stringify([]);

  // Check if an existing inactive field with this key exists (to reactivate and avoid unique constraint error)
  const [existingRows] = await pool.execute(
    'SELECT * FROM custom_field_definitions WHERE company_id = ? AND entity_type = ? AND field_key = ?',
    [companyId, entityType, fieldKey]
  );

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    if (existing.is_active === 0) {
      await pool.execute(
        `UPDATE custom_field_definitions 
         SET field_name = ?, field_type = ?, options = ?, placeholder = ?, description = ?, is_required = ?, is_active = 1, deleted_at = NULL, order_index = ?
         WHERE id = ?`,
        [
          fieldName,
          fieldType,
          optionsJson,
          placeholder || null,
          description || null,
          isRequired ? 1 : 0,
          orderIndex || 0,
          existing.id
        ]
      );
      return findById(existing.id, companyId);
    }
  }

  const [result] = await pool.execute(
    `INSERT INTO custom_field_definitions 
     (company_id, entity_type, field_key, field_name, field_type, options, placeholder, description, is_required, order_index, is_active, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)`,
    [
      companyId,
      entityType,
      fieldKey,
      fieldName,
      fieldType,
      optionsJson,
      placeholder || null,
      description || null,
      isRequired ? 1 : 0,
      orderIndex || 0
    ]
  );

  return findById(result.insertId, companyId);
}

async function updateField(id, companyId, data) {
  const existing = await findById(id, companyId);
  if (!existing) return null;

  const fieldName = data.fieldName !== undefined && String(data.fieldName).trim() ? String(data.fieldName).trim() : existing.fieldName;
  const fieldType = data.fieldType !== undefined && String(data.fieldType).trim() ? String(data.fieldType).trim() : existing.fieldType;
  const placeholder = data.placeholder !== undefined ? String(data.placeholder).trim() : existing.placeholder;
  const description = data.description !== undefined ? String(data.description).trim() : existing.description;
  const isRequired = data.isRequired !== undefined ? (data.isRequired ? 1 : 0) : (existing.isRequired ? 1 : 0);
  const orderIndex = data.orderIndex !== undefined ? data.orderIndex : existing.orderIndex;

  let optionsJson = JSON.stringify(existing.options || []);
  if (data.options !== undefined) {
    optionsJson = Array.isArray(data.options) ? JSON.stringify(data.options) : JSON.stringify([]);
  } else if (fieldType !== 'dropdown') {
    optionsJson = JSON.stringify([]);
  }

  await pool.execute(
    `UPDATE custom_field_definitions
     SET field_name = ?, field_type = ?, options = ?, placeholder = ?, description = ?, is_required = ?, order_index = ?
     WHERE id = ? AND company_id = ?`,
    [
      fieldName,
      fieldType,
      optionsJson,
      placeholder || null,
      description || null,
      isRequired,
      orderIndex,
      id,
      companyId
    ]
  );

  return findById(id, companyId);
}

/**
 * Soft delete: marks the definition inactive and records deleted_at.
 * Crucial: Existing tasks and projects retain all their stored custom_fields JSON data!
 */
async function deleteField(id, companyId) {
  const [result] = await pool.execute(
    'UPDATE custom_field_definitions SET is_active = 0, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?',
    [id, companyId]
  );
  return result.affectedRows > 0;
}

async function restoreField(id, companyId) {
  const [result] = await pool.execute(
    'UPDATE custom_field_definitions SET is_active = 1, deleted_at = NULL WHERE id = ? AND company_id = ?',
    [id, companyId]
  );
  return result.affectedRows > 0;
}

async function reorderFields(companyId, entityType, orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return true;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (let index = 0; index < orderedIds.length; index++) {
      const fieldId = orderedIds[index];
      await connection.execute(
        'UPDATE custom_field_definitions SET order_index = ? WHERE id = ? AND company_id = ? AND entity_type = ?',
        [index, fieldId, companyId, entityType]
      );
    }
    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  listFields,
  findById,
  findByKey,
  createField,
  updateField,
  deleteField,
  restoreField,
  reorderFields
};

