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

async function analyzeSrs(request, response, next) {
  try {
    const projectId = Number(request.params.id);
    const file = request.file;
    const rawText = request.body?.rawText;

    const result = await projectService.analyzeSrs(
      Number(request.user.sub),
      projectId,
      {
        fileBuffer: file ? file.buffer : null,
        mimeType: file ? file.mimetype : null,
        fileName: file ? file.originalname : null,
        rawText
      },
      request.user.companyId,
      request.user.isSuperAdmin
    );

    response.json(result);
  } catch (error) {
    next(error);
  }
}

async function commitAiTasks(request, response, next) {
  try {
    const projectId = Number(request.params.id);
    const modules = request.body?.modules || [];

    const result = await projectService.commitAiTasks(
      Number(request.user.sub),
      projectId,
      modules,
      request.user.companyId,
      request.user.isSuperAdmin
    );

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getProjectDependencies(request, response, next) {
  try {
    const projectId = Number(request.params.id);
    const dependencies = await projectService.getProjectDependencies(
      Number(request.user.sub),
      projectId,
      request.user.companyId,
      request.user.isSuperAdmin
    );
    response.json(dependencies);
  } catch (error) {
    next(error);
  }
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
