const express = require('express');
const multer = require('multer');
const { routes } = require('../../config/routes');
const controller = require('./project.controller');

const router = express.Router();

const srsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30 MB for large PDF/SRS documents
});

// AI SRS Draft & New Project Creation (must be registered before /:id routes)
router.post('/ai/srs-analyze-draft', srsUpload.single('file'), controller.analyzeSrsDraft);
router.post('/ai/create-with-tasks', controller.createProjectWithAiTasks);

// AI SRS Task & Dependency Auto-Generation for existing projects
router.post('/:id/ai/srs-analyze', srsUpload.single('file'), controller.analyzeSrs);
router.post('/:id/ai/commit-tasks', controller.commitAiTasks);
router.get('/:id/dependencies', controller.getProjectDependencies);

// Standard project CRUD routes
router.get(routes.projectPaths.list, controller.listProjects);
router.post(routes.projectPaths.list, controller.createProject);
router.put(routes.projectPaths.byId, controller.updateProject);
router.delete(routes.projectPaths.byId, controller.deleteProject);

module.exports = router;
