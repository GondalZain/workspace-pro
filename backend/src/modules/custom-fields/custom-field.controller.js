const service = require('./custom-field.service');

async function listFields(req, res, next) {
  try {
    const companyId = req.user?.companyId || req.query.companyId;
    const entityType = req.query.entityType; // 'project' | 'task' | undefined (all)
    const includeInactive = req.query.includeInactive === 'true';
    const fields = await service.listFields(companyId, entityType, includeInactive);
    res.json(fields);
  } catch (error) {
    next(error);
  }
}

async function createField(req, res, next) {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    const created = await service.createField(companyId, req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

async function updateField(req, res, next) {
  try {
    const companyId = req.user?.companyId;
    const fieldId = Number(req.params.id);
    const updated = await service.updateField(fieldId, companyId, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function deleteField(req, res, next) {
  try {
    const companyId = req.user?.companyId;
    const fieldId = Number(req.params.id);
    await service.deleteField(fieldId, companyId);
    res.json({ success: true, message: 'Custom field archived successfully without data loss.' });
  } catch (error) {
    next(error);
  }
}

async function restoreField(req, res, next) {
  try {
    const companyId = req.user?.companyId;
    const fieldId = Number(req.params.id);
    await service.restoreField(fieldId, companyId);
    res.json({ success: true, message: 'Custom field restored successfully.' });
  } catch (error) {
    next(error);
  }
}

async function reorderFields(req, res, next) {
  try {
    const companyId = req.user?.companyId;
    const { entityType, orderedIds } = req.body;
    await service.reorderFields(companyId, entityType, orderedIds);
    const updatedList = await service.listFields(companyId, entityType);
    res.json(updatedList);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listFields,
  createField,
  updateField,
  deleteField,
  restoreField,
  reorderFields
};

