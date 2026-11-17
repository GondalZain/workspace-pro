const express = require('express');
const { routes } = require('../../config/routes');
const controller = require('./project.controller');

const router = express.Router();

router.get(routes.projectPaths.list, controller.listProjects);
router.post(routes.projectPaths.list, controller.createProject);
router.put(routes.projectPaths.byId, controller.updateProject);
router.delete(routes.projectPaths.byId, controller.deleteProject);

module.exports = router;
