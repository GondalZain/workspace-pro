const express = require('express');
const controller = require('./notes.controller');
const { requireFeature } = require('../../middleware/subscription.middleware');

const router = express.Router({ mergeParams: true });

router.get('/', controller.getNotes);
router.post('/', requireFeature('tasks.mentions_comments'), controller.createNote);

module.exports = router;
