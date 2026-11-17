const timesheetRepository = require('./timesheet.repository');

function getUserId(req) {
  return Number(req.user?.sub || req.user?.id);
}

async function listTimesheets(req, res, next) {
  try {
    const entries = await timesheetRepository.findAll(getUserId(req));
    res.json(entries);
  } catch (error) {
    next(error);
  }
}

async function getTimesheet(req, res, next) {
  try {
    const entry = await timesheetRepository.findById(getUserId(req), Number(req.params.id));
    if (!entry) {
      return res.status(404).json({ error: 'Timesheet entry not found.' });
    }
    res.json(entry);
  } catch (error) {
    next(error);
  }
}

async function createTimesheet(req, res, next) {
  try {
    const entry = await timesheetRepository.create(getUserId(req), req.body);
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
}

async function updateTimesheet(req, res, next) {
  try {
    const entry = await timesheetRepository.update(getUserId(req), Number(req.params.id), req.body);
    if (!entry) {
      return res.status(404).json({ error: 'Timesheet entry not found.' });
    }
    res.json(entry);
  } catch (error) {
    next(error);
  }
}

async function deleteTimesheet(req, res, next) {
  try {
    const deleted = await timesheetRepository.delete(getUserId(req), Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Timesheet entry not found.' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTimesheets,
  getTimesheet,
  createTimesheet,
  updateTimesheet,
  deleteTimesheet
};
