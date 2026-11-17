const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const notificationsController = require('./notifications.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/stream', notificationsController.streamNotifications);
router.get('/', notificationsController.getNotifications);
router.put('/read-all', notificationsController.markAllAsRead);
router.put('/:id/read', notificationsController.markAsRead);

module.exports = router;
