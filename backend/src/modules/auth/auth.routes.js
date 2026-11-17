const express = require('express');
const controller = require('./auth.controller');
const { requireAuth, requireAdmin } = require('../../middleware/auth.middleware');
const { routes } = require('../../config/routes');
const { profileUpload } = require('../../middleware/profile-upload.middleware');

const router = express.Router();
router.post(routes.authPaths.register, profileUpload.single('profileImage'), controller.register);
router.post('/workspace-register', controller.registerWorkspace);
router.post('/inbound-email', controller.handleInboundEmail);
router.post('/public-payment-intent', async (req, res, next) => {
  try {
    const stripeService = require('../../services/stripe.service');
    const { planId, email, companyName } = req.body;
    const intent = await stripeService.createPaymentIntent({
      planId,
      email: email || '',
      companyName: companyName || ''
    });
    res.json(intent);
  } catch (error) {
    next(error);
  }
});
router.get('/verify-password-token', controller.verifyPasswordToken);
router.post('/create-password', controller.createPassword);
router.post(routes.authPaths.login, controller.login);
router.get('/company-lookup', controller.companyLookup);
router.get('/me', requireAuth, controller.getMe);
router.put(routes.authPaths.profile, requireAuth, profileUpload.single('profileImage'), controller.updateProfile);
router.get(routes.authPaths.users, requireAuth, controller.listUsers);
router.post(routes.authPaths.users, requireAuth, requireAdmin, profileUpload.single('profileImage'), controller.createUser);
router.get(routes.authPaths.userById, requireAuth, requireAdmin, controller.getUserById);
router.patch(routes.authPaths.role, requireAuth, requireAdmin, controller.setRole);
router.put(routes.authPaths.userById, requireAuth, requireAdmin, profileUpload.single('profileImage'), controller.updateUser);
router.get(routes.authPaths.roles, requireAuth, requireAdmin, controller.listRoles);
router.get(routes.authPaths.permissions, requireAuth, requireAdmin, controller.listPermissions);
router.post(routes.authPaths.roles, requireAuth, requireAdmin, controller.createRole);
router.put(routes.authPaths.roleById, requireAuth, requireAdmin, controller.updateRole);
router.delete(routes.authPaths.roleById, requireAuth, requireAdmin, controller.deleteRole);

module.exports = router;
