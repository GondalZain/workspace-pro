// @ts-nocheck
const assessmentService = require('./assessment.service');

async function getProjectMembers(request, response, next) {
  try {
    const projectId = Number(request.params.projectId);
    const members = await assessmentService.getProjectMembers(
      Number(request.user.sub),
      projectId,
      request.user.companyId,
      request.user.isSuperAdmin
    );
    response.json(members);
  } catch (error) {
    next(error);
  }
}

async function setProjectMembers(request, response, next) {
  try {
    const projectId = Number(request.params.projectId);
    const { userIds } = request.body;
    const members = await assessmentService.setProjectMembers(
      Number(request.user.sub),
      projectId,
      userIds,
      request.user.companyId,
      request.user.isSuperAdmin
    );
    response.json(members);
  } catch (error) {
    next(error);
  }
}

async function generateAssessments(request, response, next) {
  try {
    const projectId = Number(request.params.projectId);
    const { targetUserIds } = request.body;
    const result = await assessmentService.generateAssessmentsForProject(
      Number(request.user.sub),
      projectId,
      targetUserIds,
      request.user.companyId,
      request.user.isSuperAdmin
    );
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getMyPendingAssessments(request, response, next) {
  try {
    const assessments = await assessmentService.getMyPendingAssessments(Number(request.user.sub));
    response.json(assessments);
  } catch (error) {
    next(error);
  }
}

async function getMyAllAssessments(request, response, next) {
  try {
    const assessments = await assessmentService.getMyAllAssessments(Number(request.user.sub));
    response.json(assessments);
  } catch (error) {
    next(error);
  }
}

async function getAssessmentById(request, response, next) {
  try {
    const assessmentId = Number(request.params.id);
    const assessment = await assessmentService.getAssessment(Number(request.user.sub), assessmentId);
    response.json(assessment);
  } catch (error) {
    next(error);
  }
}

async function submitAssessment(request, response, next) {
  try {
    const assessmentId = Number(request.params.id);
    const { answers } = request.body;
    const result = await assessmentService.submitAssessment(
      Number(request.user.sub),
      assessmentId,
      answers || {}
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

async function smartMatchTasks(request, response, next) {
  try {
    const projectId = Number(request.params.projectId);
    const result = await assessmentService.smartMatchTasks(
      Number(request.user.sub),
      projectId,
      request.user.companyId,
      request.user.isSuperAdmin
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

async function applyTaskAssignments(request, response, next) {
  try {
    const projectId = Number(request.params.projectId);
    const { assignments } = request.body;
    const result = await assessmentService.applyTaskAssignments(
      Number(request.user.sub),
      projectId,
      assignments || [],
      request.user.companyId,
      request.user.isSuperAdmin
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

async function startProject(request, response, next) {
  try {
    const projectId = Number(request.params.projectId);
    const result = await assessmentService.startProject(
      Number(request.user.sub),
      projectId,
      request.user.companyId,
      request.user.isSuperAdmin
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

async function runAutoWorkflow(request, response, next) {
  try {
    const projectId = Number(request.params.projectId);
    const result = await assessmentService.runAutoWorkflow(
      Number(request.user.sub),
      projectId,
      request.user.companyId,
      request.user.isSuperAdmin
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}

async function getCompanyAssessments(request, response, next) {
  try {
    const assessments = await assessmentService.getCompanyAssessments(
      Number(request.user.sub),
      request.user.companyId,
      request.user.isSuperAdmin
    );
    response.json(assessments);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProjectMembers,
  setProjectMembers,
  generateAssessments,
  getMyPendingAssessments,
  getMyAllAssessments,
  getAssessmentById,
  submitAssessment,
  smartMatchTasks,
  applyTaskAssignments,
  startProject,
  runAutoWorkflow,
  getCompanyAssessments
};
