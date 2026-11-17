const express = require('express');
const timesheetController = require('./timesheet.controller');
const { requireFeature } = require('../../middleware/subscription.middleware');

const router = express.Router();

router.get('/', timesheetController.listTimesheets);
router.get('/:id', timesheetController.getTimesheet);
router.post('/', requireFeature('timesheet.logging'), timesheetController.createTimesheet);
router.put('/:id', requireFeature('timesheet.logging'), timesheetController.updateTimesheet);
router.delete('/:id', requireFeature('timesheet.logging'), timesheetController.deleteTimesheet);

module.exports = router;
