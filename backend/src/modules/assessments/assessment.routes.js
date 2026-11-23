const express = require('express');
const controller = require('./assessment.controller');

const router = express.Router();

// Current logged-in developer's pending assessments
router.get('/my-pending', controller.getMyPendingAssessments);

// Specific assessment by ID (for taking the test / viewing results)
router.get('/:id', controller.getAssessmentById);
router.post('/:id/submit', controller.submitAssessment);

// Project member roster & assessment operations
router.get('/project/:projectId/members', controller.getProjectMembers);
router.post('/project/:projectId/members', controller.setProjectMembers);
router.post('/project/:projectId/generate', controller.generateAssessments);
router.get('/project/:projectId/smart-match', controller.smartMatchTasks);
router.post('/project/:projectId/apply-assignments', controller.applyTaskAssignments);
router.post('/project/:projectId/start-project', controller.startProject);

module.exports = router;
