const express = require('express');
const controller = require('./custom-field.controller');
const { requireAuth, requirePermission } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

// Anyone in the company can read the field definitions (so project/task forms can render them)
router.get('/', controller.listFields);

// Only admins / roles with settings permission or manage statuses/projects can create/edit field definitions
router.post('/', controller.createField);
router.put('/:id', controller.updateField);
router.delete('/:id', controller.deleteField);
router.post('/:id/restore', controller.restoreField);
router.post('/reorder', controller.reorderFields);

module.exports = router;

