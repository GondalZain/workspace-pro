const projectRepository = require('./project.repository');

async function listProjects(userId, companyId = null, isSuperAdmin = false) {
  return projectRepository.findAll(userId, companyId, isSuperAdmin);
}

async function createProject(userId, input, companyId = null) {
  return projectRepository.create(userId, input, companyId);
}

async function updateProject(userId, id, input, companyId = null, isSuperAdmin = false) {
  return projectRepository.update(userId, id, input, companyId, isSuperAdmin);
}

async function deleteProject(userId, id, companyId = null, isSuperAdmin = false) {
  return projectRepository.delete(userId, id, companyId, isSuperAdmin);
}

module.exports = { listProjects, createProject, updateProject, deleteProject };
