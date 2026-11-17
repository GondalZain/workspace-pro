// @ts-nocheck
const service = require('./task-form-template.service');

function getCompanyId(req) {
  return req.user?.companyId || req.query?.companyId || req.headers?.['x-company-id'] || null;
}

async function listTemplates(req, res, next) {
  try {
    const companyId = getCompanyId(req);
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
    const templates = await service.listTemplates(companyId, isSuperAdmin);
    res.json(templates);
  } catch (err) {
    next(err);
  }
}

async function getTemplate(req, res, next) {
  try {
    const companyId = getCompanyId(req);
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
    const template = await service.getTemplate(req.params.id, companyId, isSuperAdmin);
    if (!template) {
      return res.status(404).json({ error: 'Form template not found' });
    }
    res.json(template);
  } catch (err) {
    next(err);
  }
}

async function getDefaultTemplate(req, res, next) {
  try {
    const companyId = getCompanyId(req);
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
    const template = await service.getDefaultTemplate(companyId, isSuperAdmin);
    res.json(template);
  } catch (err) {
    next(err);
  }
}

async function createTemplate(req, res, next) {
  try {
    const companyId = getCompanyId(req) || (req.user?.isSuperAdmin ? 2 : null);
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
    const created = await service.createTemplate(companyId, req.body, isSuperAdmin);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

async function updateTemplate(req, res, next) {
  try {
    const companyId = getCompanyId(req) || (req.user?.isSuperAdmin ? 2 : null);
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
    const updated = await service.updateTemplate(req.params.id, companyId, req.body, isSuperAdmin);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteTemplate(req, res, next) {
  try {
    const companyId = getCompanyId(req) || (req.user?.isSuperAdmin ? 2 : null);
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
    const result = await service.deleteTemplate(req.params.id, companyId, isSuperAdmin);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function assignProjectsToTemplate(req, res, next) {
  try {
    const companyId = getCompanyId(req);
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
    const { templateId, projectIds } = req.body;
    await service.assignProjects(companyId, templateId, projectIds, isSuperAdmin);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function assignTasksToTemplate(req, res, next) {
  try {
    const companyId = getCompanyId(req);
    const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
    const { templateId, taskIds } = req.body;
    await service.assignTasks(companyId, templateId, taskIds, isSuperAdmin);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTemplates,
  getTemplate,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  assignProjectsToTemplate,
  assignTasksToTemplate
};
