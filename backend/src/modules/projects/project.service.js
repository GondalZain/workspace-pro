const projectRepository = require('./project.repository');
const taskRepository = require('../tasks/task.repository');
const geminiService = require('../../services/ai/gemini.service');

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

async function analyzeSrs(userId, projectId, { fileBuffer, mimeType, fileName, rawText }, companyId = null, isSuperAdmin = false) {
  const project = await projectRepository.findById(userId, projectId, companyId, isSuperAdmin);
  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  return geminiService.analyzeSrsDocument({
    fileBuffer,
    mimeType,
    fileName,
    rawText,
    projectTitle: project.title
  });
}

async function commitAiTasks(userId, projectId, modules, companyId = null, isSuperAdmin = false) {
  const project = await projectRepository.findById(userId, projectId, companyId, isSuperAdmin);
  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  return taskRepository.batchCreateTasksWithDependencies({
    userId,
    companyId: project.company_id || companyId,
    projectId: project.id,
    modules
  });
}

async function getProjectDependencies(userId, projectId, companyId = null, isSuperAdmin = false) {
  const project = await projectRepository.findById(userId, projectId, companyId, isSuperAdmin);
  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  return taskRepository.getProjectDependencies(projectId);
}

module.exports = {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  analyzeSrs,
  commitAiTasks,
  getProjectDependencies
};
