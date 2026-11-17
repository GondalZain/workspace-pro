// @ts-nocheck
const repository = require('./task-form-template.repository');

async function listTemplates(companyId, isSuperAdmin = false) {
  return repository.listByCompany(companyId, isSuperAdmin);
}

async function getTemplate(id, companyId, isSuperAdmin = false) {
  if (!id) return null;
  return repository.findById(id, companyId, isSuperAdmin);
}

async function getDefaultTemplate(companyId, isSuperAdmin = false) {
  return repository.getDefaultByCompany(companyId, isSuperAdmin);
}

async function createTemplate(companyId, data, isSuperAdmin = false) {
  const targetCompanyId = companyId || (isSuperAdmin ? 2 : null);
  if (!targetCompanyId) {
    const error = new Error('Company ID is required');
    error.statusCode = 400;
    throw error;
  }
  if (!data.name || !String(data.name).trim()) {
    const error = new Error('Form template name is required');
    error.statusCode = 400;
    throw error;
  }
  return repository.create(targetCompanyId, data);
}

async function updateTemplate(id, companyId, data, isSuperAdmin = false) {
  const targetCompanyId = companyId || (isSuperAdmin ? 2 : null);
  if (!id) {
    const error = new Error('Template ID is required');
    error.statusCode = 400;
    throw error;
  }
  const updated = await repository.update(id, targetCompanyId, data, isSuperAdmin);
  if (!updated) {
    const error = new Error('Form template not found');
    error.statusCode = 404;
    throw error;
  }
  return updated;
}

async function deleteTemplate(id, companyId, isSuperAdmin = false) {
  const targetCompanyId = companyId || (isSuperAdmin ? 2 : null);
  if (!id) {
    const error = new Error('Template ID is required');
    error.statusCode = 400;
    throw error;
  }
  const deleted = await repository.softDelete(id, targetCompanyId, isSuperAdmin);
  if (!deleted) {
    const error = new Error('Form template not found');
    error.statusCode = 404;
    throw error;
  }
  return { success: true };
}

async function assignProjects(companyId, templateId, projectIds, isSuperAdmin = false) {
  return repository.assignProjects(companyId, templateId, projectIds, isSuperAdmin);
}

async function assignTasks(companyId, templateId, taskIds, isSuperAdmin = false) {
  return repository.assignTasks(companyId, templateId, taskIds, isSuperAdmin);
}

module.exports = {
  listTemplates,
  getTemplate,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  assignProjects,
  assignTasks
};
