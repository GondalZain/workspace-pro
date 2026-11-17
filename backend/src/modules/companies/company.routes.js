// @ts-nocheck
const express = require('express');
const multer = require('multer');
const path = require('node:path');
const companyService = require('./company.service');
const taskService = require('../tasks/task.service');
const notificationsController = require('../notifications/notifications.controller');
const { requireAuth } = require('../../middleware/auth.middleware');

const authRepository = require('../auth/auth.repository');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `company-logo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Middleware to enforce Super Admin role
async function requireSuperAdmin(req, res, next) {
  try {
    const access = await authRepository.findAccessByUserId(Number(req.user.sub));
    if (access?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super Admin privileges required.' });
    }
    req.userAccess = access;
    next();
  } catch (error) { next(error); }
}

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get('/', async (req, res, next) => {
  try {
    const result = await companyService.listCompanies();
    res.json(result);
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const company = await companyService.getCompanyById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });
    res.json(company);
  } catch (error) { next(error); }
});

router.post('/', upload.single('logo'), async (req, res, next) => {
  try {
    let logoPath = null;
    if (req.file) {
      logoPath = `/uploads/${req.file.filename}`;
    }
    const payload = {
      ...req.body,
      logoPath
    };
    const result = await companyService.createCompanyWithAdmin(payload);
    res.status(201).json(result);
  } catch (error) { next(error); }
});

// Helper: Generate password setup token and dispatch approval email when a company transitions to 'active'
async function triggerWorkspaceApprovalEmail(companyResult, req) {
  try {
    const mailService = require('../../services/mail.service');
    const crypto = require('crypto');
    const { pool } = require('../../config/database');
    let admins = companyResult.admins || [];
    let primaryAdmin = admins[0];

    // Fallback: if no admin matched role filter, pick the first user belonging to this company
    if (!primaryAdmin || !primaryAdmin.email) {
      const [userRows] = await pool.execute(
        'SELECT id, username, email FROM users WHERE company_id = ? ORDER BY id ASC LIMIT 1',
        [companyResult.id]
      );
      primaryAdmin = userRows[0];
    }

    if (primaryAdmin && primaryAdmin.email) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours validity
      await authRepository.setPasswordResetToken(primaryAdmin.id, resetToken, expiresAt);

      const { buildDynamicClientUrl } = require('../../services/mail/mail.links');
      const createPasswordUrl = buildDynamicClientUrl(companyResult.domain, '/create-password', { token: resetToken }, req);

      const emailRes = await mailService.sendWorkspaceApprovedEmail({
        recipientEmail: primaryAdmin.email,
        recipientName: primaryAdmin.username,
        companyName: companyResult.name,
        domain: companyResult.domain,
        createPasswordUrl
      });
      console.log(`[CompanyApproval] Password creation email dispatched to ${primaryAdmin.email} for "${companyResult.name}":`, emailRes);
    } else {
      console.warn(`[CompanyApproval] No admin user found for company ID ${companyResult.id} ("${companyResult.name}")`);
    }
  } catch (e) {
    console.warn('Failed to trigger approval email:', e);
  }
}

router.put('/:id', upload.single('logo'), async (req, res, next) => {
  try {
    const previousCompany = await companyService.getCompanyById(req.params.id);
    let logoPath = undefined;
    if (req.file) {
      logoPath = `/uploads/${req.file.filename}`;
    } else if (req.body.removeLogo === 'true') {
      logoPath = null;
    }
    const payload = {
      ...req.body,
      logoPath
    };
    const result = await companyService.updateCompany(req.params.id, payload);

    // If status changed from pending/rejected/suspended to active via Edit Company, send approval email
    if (previousCompany && previousCompany.status !== 'active' && result.status === 'active') {
      await triggerWorkspaceApprovalEmail(result, req);
    }

    res.json(result);
  } catch (error) { next(error); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, domain, emailDomain, title, description, primaryColor, secondaryColor } = req.body;
    if (!status || !['active', 'suspended', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (active, suspended, pending, rejected) is required.' });
    }

    // When approving/activating, custom domain is required
    if (status === 'active') {
      const existing = await companyService.getCompanyById(req.params.id);
      const targetDomain = (domain !== undefined ? domain : existing?.domain)?.trim()?.toLowerCase();
      if (!targetDomain) {
        return res.status(400).json({ error: 'Custom domain access must be configured before approving and activating this workspace.' });
      }
    }

    const payload = { status };
    if (domain !== undefined) payload.domain = domain;
    if (emailDomain !== undefined) payload.emailDomain = emailDomain;
    if (title !== undefined) payload.title = title;
    if (description !== undefined) payload.description = description;
    if (primaryColor !== undefined) payload.primaryColor = primaryColor;
    if (secondaryColor !== undefined) payload.secondaryColor = secondaryColor;

    const result = await companyService.updateCompany(req.params.id, payload);
    try {
      const notificationsController = require('../notifications/notifications.controller');
      notificationsController.sendToSuperAdmins('company_status_changed', {
        companyId: Number(req.params.id),
        status: payload.status,
        company: result
      });
    } catch {}

    // When approving workspace, generate password setup token & send approval email with create-password link
    if (payload.status === 'active') {
      await triggerWorkspaceApprovalEmail(result, req);
    }

    res.json(result);
  } catch (error) { next(error); }
});

router.post('/:id/admins', async (req, res, next) => {
  try {
    const result = await companyService.addCompanyAdmin(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) { next(error); }
});

router.put('/:id/admins/:adminId', async (req, res, next) => {
  try {
    const updatedAdmins = await companyService.updateCompanyAdmin(req.params.id, req.params.adminId, req.body);
    res.json({ admins: updatedAdmins });
  } catch (error) { next(error); }
});

router.patch('/:id/admins/:adminId/role', async (req, res, next) => {
  try {
    const updatedAdmins = await companyService.updateCompanyAdminRole(req.params.id, req.params.adminId, req.body.roleId);
    res.json({ admins: updatedAdmins });
  } catch (error) { next(error); }
});

router.delete('/:id/admins/:adminId', async (req, res, next) => {
  try {
    const updatedAdmins = await companyService.deleteCompanyAdmin(req.params.id, req.params.adminId);
    res.json({ admins: updatedAdmins });
  } catch (error) { next(error); }
});

router.get('/:id/statuses', async (req, res, next) => {
  try {
    const statuses = await taskService.getStatuses(req.params.id);
    res.json(statuses);
  } catch (error) { next(error); }
});

router.get('/:id/statuses/usage', async (req, res, next) => {
  try {
    const identifier = req.query.name || req.query.id || req.query.statusId || req.query.slug;
    const count = await taskService.countTasksWithStatus(req.params.id, identifier);
    res.json({ identifier, slug: identifier, taskCount: count, canDelete: count === 0 });
  } catch (error) { next(error); }
});

router.put('/:id/statuses', async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const updated = await taskService.updateStatuses(companyId, req.body);
    
    // Broadcast real-time update to all active users belonging to this company
    notificationsController.sendToCompany(companyId, 'statuses_updated', {
      companyId: Number(companyId),
      statuses: updated
    });

    res.json(updated);
  } catch (error) { next(error); }
});



router.delete('/:id', async (req, res, next) => {
  try {
    await companyService.deleteCompany(req.params.id);
    try {
      const notificationsController = require('../notifications/notifications.controller');
      notificationsController.sendToSuperAdmins('company_deleted', {
        companyId: Number(req.params.id)
      });
    } catch {}
    res.status(204).end();
  } catch (error) { next(error); }
});


// GET /api/super-admin/companies/marketing-invitations
router.get('/marketing-invitations', async (req, res, next) => {
  try {
    const { pool } = require('../../config/database');
    const [rows] = await pool.execute(`
      SELECT 
        id,
        recipient_email as recipientEmail,
        custom_message as customMessage,
        status,
        reply_content as replyContent,
        registered_company_id as registeredCompanyId,
        registered_company_name as registeredCompanyName,
        sent_at as sentAt,
        replied_at as repliedAt
      FROM marketing_invitations
      ORDER BY sent_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/super-admin/companies/marketing-invitations
router.get('/marketing-invitations', async (req, res, next) => {
  try {
    const { pool } = require('../../config/database');
    const [rows] = await pool.execute(`
      SELECT 
        id,
        recipient_email as recipientEmail,
        custom_message as customMessage,
        status,
        registered_company_id as registeredCompanyId,
        registered_company_name as registeredCompanyName,
        sent_at as sentAt,
        replied_at as repliedAt
      FROM marketing_invitations
      ORDER BY sent_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/super-admin/companies/send-marketing-invitation
router.post('/send-marketing-invitation', async (req, res, next) => {
  try {
    const { recipientEmail, customMessage } = req.body;
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({ error: 'A valid recipient email is required.' });
    }

    const mailService = require('../../services/mail.service');
    const result = await mailService.sendMarketingInvitationEmail({
      recipientEmail: recipientEmail.trim(),
      customMessage: (customMessage || '').trim()
    });

    // Record in MySQL marketing_invitations table
    let insertId = null;
    try {
      const { pool } = require('../../config/database');
      const [insertResult] = await pool.execute(
        `INSERT INTO marketing_invitations (recipient_email, custom_message, status, message_id, sent_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [
          recipientEmail.trim(),
          (customMessage || '').trim() || null,
          result.success ? 'sent' : 'failed',
          result.messageId || null
        ]
      );
      insertId = insertResult.insertId;
    } catch (dbErr) {
      console.warn('[Marketing] Could not record invitation in DB:', dbErr.message);
    }

    res.json({
      success: true,
      message: `Marketing invitation sent successfully to ${recipientEmail}`,
      details: result,
      invitationId: insertId
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
