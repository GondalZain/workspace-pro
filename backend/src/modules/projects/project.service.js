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

async function analyzeSrsDraft(userId, { fileBuffer, mimeType, fileName, rawText, projectTitle }, companyId = null, isSuperAdmin = false) {
  return geminiService.analyzeSrsDocument({
    fileBuffer,
    mimeType,
    fileName,
    rawText,
    projectTitle: projectTitle || 'New Project'
  });
}

async function createProjectWithAiTasks(userId, input, companyId = null) {
  const { modules, ...projectInput } = input;

  // 1. Create the project
  const project = await projectRepository.create(userId, projectInput, companyId);

  // 2. Batch create tasks with dependencies if any modules provided
  let tasksResult = { createdTasksCount: 0, insertedDependenciesCount: 0, tasks: [] };
  if (Array.isArray(modules) && modules.length > 0) {
    tasksResult = await taskRepository.batchCreateTasksWithDependencies({
      userId,
      companyId: project.company_id || companyId,
      projectId: project.id,
      modules
    });
  }

  // 3. Auto-Workflow: If developerUserIds are provided, enroll members & auto-generate AI assessments!
  let assessmentsResult = null;
  if (Array.isArray(input.developerUserIds) && input.developerUserIds.length > 0) {
    try {
      const assessmentService = require('../assessments/assessment.service');
      await assessmentService.setProjectMembers(userId, project.id, input.developerUserIds, project.company_id || companyId, true);
      assessmentsResult = await assessmentService.generateAssessmentsForProject(
        userId,
        project.id,
        input.developerUserIds,
        project.company_id || companyId,
        true
      );
      console.log(`[ProjectService] Auto-generated assessments for ${input.developerUserIds.length} developers on project #${project.id}`);
    } catch (assErr) {
      console.warn(`[ProjectService] Auto-assessment generation warning:`, assErr.message);
    }
  }

  return {
    project,
    createdTasksCount: tasksResult.createdTasksCount,
    insertedDependenciesCount: tasksResult.insertedDependenciesCount,
    tasks: tasksResult.tasks,
    generatedAssessmentsCount: assessmentsResult?.generatedCount || 0
  };
}

module.exports = {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  analyzeSrs,
  commitAiTasks,
  getProjectDependencies,
  analyzeSrsDraft,
  createProjectWithAiTasks
};
