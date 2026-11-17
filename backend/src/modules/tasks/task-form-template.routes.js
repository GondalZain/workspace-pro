// @ts-nocheck
const express = require('express');
const controller = require('./task-form-template.controller');
const { requireAuth, requirePermission } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

// All authenticated company members can list and view form templates to render task forms
router.get('/', controller.listTemplates);
router.get('/default', controller.getDefaultTemplate);
router.get('/:id', controller.getTemplate);

// Form templates management: admin / company members can manage templates
router.post('/assign-projects', controller.assignProjectsToTemplate);
router.post('/assign-tasks', controller.assignTasksToTemplate);
router.post('/', controller.createTemplate);
router.put('/:id', controller.updateTemplate);
router.delete('/:id', controller.deleteTemplate);

module.exports = router;

