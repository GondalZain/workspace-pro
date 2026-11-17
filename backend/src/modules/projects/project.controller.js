const projectService = require('./project.service');

async function listProjects(request, response, next) {
  try {
    response.json(await projectService.listProjects(
      Number(request.user.sub),
      request.user.companyId,
      request.user.isSuperAdmin
    ));
  } catch (error) {
    next(error);
  }
}

async function createProject(request, response, next) {
  try {
    const project = await projectService.createProject(
      Number(request.user.sub),
      request.body || {},
      request.user.companyId
    );
    response.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

async function updateProject(request, response, next) {
  try {
    const project = await projectService.updateProject(
      Number(request.user.sub),
      Number(request.params.id),
      request.body || {},
      request.user.companyId,
      request.user.isSuperAdmin
    );
    if (!project) return response.status(404).json({ error: 'Project not found.' });
    response.json(project);
  } catch (error) {
    next(error);
  }
}

async function deleteProject(request, response, next) {
  try {
    const deleted = await projectService.deleteProject(
      Number(request.user.sub),
      Number(request.params.id),
      request.user.companyId,
      request.user.isSuperAdmin
    );
    if (!deleted) return response.status(404).json({ error: 'Project not found.' });
    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = { listProjects, createProject, updateProject, deleteProject };
