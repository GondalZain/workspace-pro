const repository = require('./custom-field.repository');

function slugifyKey(input) {
  if (!input) return '';
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function listFields(companyId, entityType, includeInactive = false) {
  if (!companyId) return [];
  return repository.listFields(companyId, entityType, includeInactive);
}

async function createField(companyId, payload) {
  if (!companyId) {
    const error = new Error('Company context is required to create custom fields.');
    error.statusCode = 400;
    throw error;
  }

  const { entityType, fieldName, fieldType, options, placeholder, description, isRequired } = payload;

  if (!['project', 'task'].includes(entityType)) {
    const error = new Error('Valid entityType ("project" or "task") is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!fieldName || typeof fieldName !== 'string' || !fieldName.trim()) {
    const error = new Error('Field name is required.');
    error.statusCode = 400;
    throw error;
  }

  const validTypes = ['text', 'number', 'date', 'dropdown', 'checkbox', 'textarea'];
  if (!validTypes.includes(fieldType)) {
    const error = new Error(`Invalid fieldType. Supported types are: ${validTypes.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Derive fieldKey from provided key or slugify from fieldName
  let fieldKey = slugifyKey(payload.fieldKey || fieldName);
  if (!fieldKey) fieldKey = `field_${Date.now()}`;

  // Check unique key
  const existing = await repository.findByKey(companyId, entityType, fieldKey);
  if (existing) {
    const error = new Error(`A field with key "${fieldKey}" already exists for ${entityType}s.`);
    error.statusCode = 409;
    throw error;
  }

  // Calculate next order index
  const currentList = await repository.listFields(companyId, entityType);
  const nextOrderIndex = currentList.length;

  return repository.createField(companyId, {
    entityType,
    fieldKey,
    fieldName: fieldName.trim(),
    fieldType,
    options: Array.isArray(options) ? options : [],
    placeholder: placeholder ? String(placeholder).trim() : '',
    description: description ? String(description).trim() : '',
    isRequired: Boolean(isRequired),
    orderIndex: nextOrderIndex
  });
}

async function updateField(id, companyId, payload) {
  const existing = await repository.findById(id, companyId);
  if (!existing) {
    const error = new Error('Custom field definition not found.');
    error.statusCode = 404;
    throw error;
  }

  return repository.updateField(id, companyId, payload);
}

async function deleteField(id, companyId) {
  const existing = await repository.findById(id, companyId);
  if (!existing) {
    const error = new Error('Custom field definition not found.');
    error.statusCode = 404;
    throw error;
  }

  return repository.deleteField(id, companyId);
}

async function restoreField(id, companyId) {
  const existing = await repository.findById(id, companyId);
  if (!existing) {
    const error = new Error('Custom field definition not found.');
    error.statusCode = 404;
    throw error;
  }

  return repository.restoreField(id, companyId);
}

async function reorderFields(companyId, entityType, orderedIds) {
  if (!['project', 'task'].includes(entityType)) {
    const error = new Error('Valid entityType is required.');
    error.statusCode = 400;
    throw error;
  }
  return repository.reorderFields(companyId, entityType, orderedIds);
}

module.exports = {
  listFields,
  createField,
  updateField,
  deleteField,
  restoreField,
  reorderFields
};

