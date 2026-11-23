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

async function getMyAllAssessments(userId) {
  return assessmentRepository.findMyAllAssessments(userId);
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

  const saved = await assessmentRepository.saveAssessmentEvaluation(
    assessmentId,
    userId,
    answersPayload,
    evaluation
  );

  // Auto-Pilot Check: If all members for this project are now evaluated, auto-allocate tasks!
  try {
    const allMembers = await assessmentRepository.getProjectMembers(assessment.projectId);
    const unEvaluated = allMembers.filter((m) => m.readinessStatus !== 'evaluated');
    if (unEvaluated.length === 0 && allMembers.length > 0) {
      console.log(`[AssessmentService] Auto-Pilot: All developers evaluated for project #${assessment.projectId}. Auto-allocating tasks...`);
      const matchResult = await smartMatchTasks(userId, assessment.projectId, assessment.companyId, true);
      if (matchResult?.assignments?.length > 0) {
        await applyTaskAssignments(userId, assessment.projectId, matchResult.assignments, assessment.companyId, true);
        console.log(`[AssessmentService] Auto-Pilot: Successfully applied ${matchResult.assignments.length} task assignments!`);
      }
    }
  } catch (autoErr) {
    console.warn(`[AssessmentService] Auto-Pilot background check warning:`, autoErr.message);
  }

  return saved;
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

async function runAutoWorkflow(userId, projectId, companyId, isSuperAdmin) {
  const project = await projectRepository.findById(userId, projectId, companyId, isSuperAdmin);
  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  let members = await assessmentRepository.getProjectMembers(projectId);
  if (members.length === 0) {
    return {
      success: false,
      stage: 'assign_team',
      message: 'No developers have been assigned to this project yet. Please assign team members first.',
      actionNeeded: 'Assign developers to the project team.'
    };
  }

  // 1. Auto-generate assessments if any member has no assessment
  const membersWithoutAssessment = members.filter((m) => !m.assessmentId);
  let generatedCount = 0;
  if (membersWithoutAssessment.length > 0) {
    console.log(`[AutoWorkflow] Generating technical assessment for ${membersWithoutAssessment.length} member(s)...`);
    const genRes = await generateAssessmentsForProject(
      userId,
      projectId,
      membersWithoutAssessment.map((m) => m.userId),
      companyId,
      isSuperAdmin
    );
    generatedCount = genRes.generatedCount || membersWithoutAssessment.length;
    // reload members
    members = await assessmentRepository.getProjectMembers(projectId);
  }

  // 2. Check evaluation progress
  const evaluatedMembers = members.filter((m) => m.readinessStatus === 'evaluated');
  const pendingMembers = members.filter((m) => m.readinessStatus !== 'evaluated');

  if (evaluatedMembers.length === 0) {
    return {
      success: true,
      stage: 'awaiting_evaluations',
      message: `AI Assessments generated for all ${members.length} team members. Waiting for developers to complete their technical assessments.`,
      generatedAssessmentsCount: generatedCount,
      evaluatedCount: 0,
      totalMembers: members.length
    };
  }

  // 3. Auto-allocate tasks based on evaluated developers so far
  console.log(`[AutoWorkflow] Running smart task matching for ${evaluatedMembers.length} evaluated developer(s)...`);
  const matchResult = await smartMatchTasks(userId, projectId, companyId, isSuperAdmin);
  let allocatedCount = 0;
  if (matchResult?.assignments?.length > 0) {
    await applyTaskAssignments(userId, projectId, matchResult.assignments, companyId, isSuperAdmin);
    allocatedCount = matchResult.assignments.length;
  }

  // 4. If all members evaluated, start project automatically!
  let projectStatus = project.status || 'planning';
  if (pendingMembers.length === 0) {
    await startProject(userId, projectId, companyId, isSuperAdmin);
    projectStatus = 'active';
  }

  return {
    success: true,
    stage: pendingMembers.length === 0 ? 'project_active' : 'partially_allocated',
    message: pendingMembers.length === 0
      ? `Full auto-workflow complete! All ${members.length} developers evaluated, ${allocatedCount} tasks allocated, and project started.`
      : `Auto-workflow progressed: ${evaluatedMembers.length}/${members.length} developers evaluated. ${allocatedCount} tasks matched to available skills.`,
    allocatedCount,
    projectStatus,
    evaluatedCount: evaluatedMembers.length,
    totalMembers: members.length,
    matchSummary: matchResult?.allocationSummary || ''
  };
}

async function getCompanyAssessments(userId, companyId, isSuperAdmin) {
  const targetCompanyId = isSuperAdmin ? null : companyId;
  return assessmentRepository.findAllCompanyAssessments(targetCompanyId);
}

module.exports = {
  getProjectMembers,
  setProjectMembers,
  generateAssessmentsForProject,
  getAssessment,
  getMyPendingAssessments,
  getMyAllAssessments,
  submitAssessment,
  smartMatchTasks,
  applyTaskAssignments,
  startProject,
  runAutoWorkflow,
  getCompanyAssessments
};
