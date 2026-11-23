// @ts-nocheck
const assessmentRepository = require('./assessment.repository');
const projectRepository = require('../projects/project.repository');
const taskRepository = require('../tasks/task.repository');
const geminiService = require('../../services/ai/gemini.service');
const { pool } = require('../../config/database');

async function getProjectMembers(userId, projectId, companyId, isSuperAdmin) {
  const project = await projectRepository.findById(userId, projectId, companyId, isSuperAdmin);
  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }
  return assessmentRepository.getProjectMembers(projectId);
}

async function setProjectMembers(userId, projectId, userIds, companyId, isSuperAdmin) {
  const project = await projectRepository.findById(userId, projectId, companyId, isSuperAdmin);
  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }
  return assessmentRepository.setProjectMembers(projectId, userIds, project.company_id || companyId);
}

async function generateAssessmentsForProject(userId, projectId, targetUserIds = null, companyId, isSuperAdmin) {
  const project = await projectRepository.findById(userId, projectId, companyId, isSuperAdmin);
  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  // Get all tasks for this project to extract requirements and tech stack
  const tasks = await taskRepository.findAll(userId, { projectId }, companyId, isSuperAdmin);
  if (!tasks || tasks.length === 0) {
    const error = new Error('This project has no tasks. Please decompose requirements into tasks first.');
    error.statusCode = 400;
    throw error;
  }

  // Generate customized 5 technical scenario questions with Gemini AI
  console.log(`[AssessmentService] Generating AI technical assessment for project "${project.title}"...`);
  const questionsPayload = await geminiService.generateAssessmentQuestions({
    projectTitle: project.title,
    projectDescription: project.description,
    tasks
  });

  // Determine developers to test
  let members = await assessmentRepository.getProjectMembers(projectId);
  if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
    const targetSet = new Set(targetUserIds.map(Number));
    members = members.filter((m) => targetSet.has(m.userId));
  }

  if (members.length === 0) {
    const error = new Error('No developers assigned to this project. Please add developers first.');
    error.statusCode = 400;
    throw error;
  }

  const generated = [];
  for (const member of members) {
    const assessment = await assessmentRepository.createOrUpdateAssessment(
      projectId,
      member.userId,
      project.company_id || companyId,
      questionsPayload
    );

    // Optional notification insertion
    try {
      await pool.execute(
        `INSERT INTO notifications (user_id, company_id, type, title, message, link, is_read, created_at)
         VALUES (?, ?, 'assessment_required', ?, ?, ?, 0, NOW())`,
        [
          member.userId,
          project.company_id || companyId,
          `Technical Assessment Required: ${project.title}`,
          `You have been assigned to project "${project.title}". Please complete your AI technical readiness assessment.`,
          `/projects/${projectId}`
        ]
      );
    } catch {}

    generated.push(assessment);
  }

  return {
    projectId,
    projectTitle: project.title,
    questionsCount: questionsPayload.questions?.length || 5,
    assessmentsCount: generated.length,
    members: await assessmentRepository.getProjectMembers(projectId)
  };
}

async function getAssessment(userId, assessmentId) {
  const assessment = await assessmentRepository.findAssessmentById(assessmentId);
  if (!assessment) {
    const error = new Error('Assessment not found.');
    error.statusCode = 404;
    throw error;
  }
  return assessment;
}

async function getMyPendingAssessments(userId) {
  return assessmentRepository.findMyPendingAssessments(userId);
}

async function submitAssessment(userId, assessmentId, answersPayload) {
  const assessment = await assessmentRepository.findAssessmentById(assessmentId);
  if (!assessment) {
    const error = new Error('Assessment not found.');
    error.statusCode = 404;
    throw error;
  }

  if (assessment.userId !== Number(userId)) {
    const error = new Error('You are not authorized to submit this assessment.');
    error.statusCode = 403;
    throw error;
  }

  const questions = assessment.questions?.questions || [];
  if (questions.length === 0) {
    const error = new Error('Assessment has no questions configured.');
    error.statusCode = 400;
    throw error;
  }

  console.log(`[AssessmentService] Evaluating developer ${assessment.username} for project ${assessment.projectTitle}...`);
  const evaluation = await geminiService.evaluateAssessmentAnswers({
    projectTitle: assessment.projectTitle,
    questions,
    answers: answersPayload
  });

  return assessmentRepository.saveAssessmentEvaluation(
    assessmentId,
    userId,
    answersPayload,
    evaluation
  );
}

async function smartMatchTasks(userId, projectId, companyId, isSuperAdmin) {
  const project = await projectRepository.findById(userId, projectId, companyId, isSuperAdmin);
  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  const tasks = await taskRepository.findAll(userId, { projectId }, companyId, isSuperAdmin);
  const members = await assessmentRepository.getProjectMembers(projectId);

  const evaluatedDevelopers = members
    .filter((m) => m.score !== null)
    .map((m) => ({
      userId: m.userId,
      username: m.username,
      score: m.score,
      evaluatedLevel: m.evaluatedLevel,
      maxComplexity: m.maxComplexity,
      domainScores: m.feedback?.domainScores || { backend: 70, database: 70, frontend: 70, security: 70, architecture: 70 }
    }));

  if (evaluatedDevelopers.length === 0) {
    const error = new Error('No developers have completed the assessment yet. At least one developer must be evaluated.');
    error.statusCode = 400;
    throw error;
  }

  console.log(`[AssessmentService] Running AI smart task matching for ${tasks.length} tasks across ${evaluatedDevelopers.length} developers...`);
  return geminiService.smartMatchTasksToDevelopers({
    projectTitle: project.title,
    tasks,
    developers: evaluatedDevelopers
  });
}

async function applyTaskAssignments(userId, projectId, assignments, companyId, isSuperAdmin) {
  const project = await projectRepository.findById(userId, projectId, companyId, isSuperAdmin);
  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  await assessmentRepository.applyTaskAssignments(projectId, assignments);
  return {
    success: true,
    appliedCount: assignments.length,
    projectId
  };
}

async function startProject(userId, projectId, companyId, isSuperAdmin) {
  const project = await projectRepository.findById(userId, projectId, companyId, isSuperAdmin);
  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  await assessmentRepository.updateProjectStatus(projectId, 'active');
  return {
    success: true,
    projectId,
    status: 'active'
  };
}

module.exports = {
  getProjectMembers,
  setProjectMembers,
  generateAssessmentsForProject,
  getAssessment,
  getMyPendingAssessments,
  submitAssessment,
  smartMatchTasks,
  applyTaskAssignments,
  startProject
};
