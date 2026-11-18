// @ts-nocheck
const bcrypt = require('bcryptjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const { jwtSecret, smtp } = require('../../config/env');

async function deleteOldProfileImageIfNeeded(previousUser, nextProfileImagePath) {
  if (!previousUser || !previousUser.profile_image_path) return;

  const normalizedNextPath = typeof nextProfileImagePath === 'string' ? nextProfileImagePath.trim() : '';
  if (normalizedNextPath && previousUser.profile_image_path === normalizedNextPath) return;

  const previousRelativePath = previousUser.profile_image_path.replace(/\\/g, '/').replace(/^\/+/, '');
  const absolutePath = path.join(__dirname, '../../../', previousRelativePath);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Unable to remove old profile image:', error.message);
    }
  }
}

function shouldReplaceProfileImage(currentProfileImagePath, nextProfileImagePath) {
  if (nextProfileImagePath === null) return true;
  if (typeof nextProfileImagePath !== 'string') return false;

  const normalizedNextPath = nextProfileImagePath.trim();
  if (!normalizedNextPath) return false;
  return currentProfileImagePath !== normalizedNextPath;
}

function sanitizeUserForPublicView(user) {
  return {
    id: Number(user.id),
    username: user.username,
    profileImagePath: user.profile_image_path || null,
    role: user.role_name || user.role || 'user'
  };
}

function publicUser(user, permissions = []) {
  const companyId = user.company_id ? Number(user.company_id) : null;
  return {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    originalEmail: user.original_email || null,
    profileImagePath: user.profile_image_path || null,
    roleId: user.role_id ? Number(user.role_id) : null,
    role: user.role_name || user.role || 'user',
    companyId,
    company: companyId ? {
      id: companyId,
      name: user.company_name || '',
      title: user.company_title || '',
      description: user.company_description || '',
      logoPath: user.company_logo_path || null,
      primaryColor: user.company_primary_color || '#0f766e',
      secondaryColor: user.company_secondary_color || '#ffffff',
      emailDomain: user.company_email_domain || null,
      domain: user.company_domain || null,
      planId: user.company_plan_id || 'trial',
      subscriptionStatus: user.company_subscription_status || 'active'
    } : null,
    permissions
  };
}

function createToken(user) {
  const companyId = user.company_id ? Number(user.company_id) : null;
  const role = user.role_name || user.role || 'user';
  return jwt.sign({ sub: Number(user.id), email: user.email, username: user.username, companyId, role }, jwtSecret, { expiresIn: '7d' });
}

async function register(input) {
  const username = typeof input?.username === 'string' ? input.username.trim() : '';
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  if (!username || !email || password.length < 8 || !input.profileImagePath) {
    const error = new Error('Username, email, password, and a profile image are required.');
    error.statusCode = 400;
    throw error;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    const error = new Error('A valid email address is required.');
    error.statusCode = 400;
    throw error;
  }
  try {
    const user = await authRepository.create({ username, email, passwordHash: await bcrypt.hash(password, 12), profileImagePath: input.profileImagePath, companyId: input.companyId });
    const access = await authRepository.findAccessByUserId(user.id);
    return { user: publicUser(user, access.permissions), token: createToken(user) };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') { error.statusCode = 409; error.message = 'That email address is already registered.'; }
    throw error;
  }
}

async function login(input) {
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  const targetCompanyId = input?.companyId !== undefined && input?.companyId !== null && input?.companyId !== ''
    ? Number(input.companyId)
    : null;

  // 1. Fetch matching user(s) by email
  let users = [];
  if (targetCompanyId) {
    const userForCompany = await authRepository.findByEmail(email, targetCompanyId);
    if (userForCompany) {
      users = [userForCompany];
    } else {
      // Check if this email is a super_admin who can access any portal
      const allUsers = await authRepository.findAllByEmail(email);
      const superAdminUser = allUsers.find(u => u.role_name === 'super_admin');
      if (superAdminUser) {
        users = [superAdminUser];
      } else {
        const error = new Error('This account is not registered with this company workspace.');
        error.statusCode = 403;
        error.code = 'NOT_COMPANY_MEMBER';
        throw error;
      }
    }
  } else {
    users = await authRepository.findAllByEmail(email);
  }

  if (users.length === 0) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // 2. Authenticate password against matched candidate accounts
  let authenticatedUser = null;
  for (const candidate of users) {
    const matches = await bcrypt.compare(password, candidate.password_hash);
    if (matches) {
      authenticatedUser = candidate;
      break;
    }
  }

  if (!authenticatedUser) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // 3. If logging into a specific company domain, ensure user belongs to this company (or is super_admin)
  if (targetCompanyId && authenticatedUser.role_name !== 'super_admin') {
    if (Number(authenticatedUser.company_id) !== targetCompanyId) {
      const error = new Error('This account is not registered with this company workspace.');
      error.statusCode = 403;
      error.code = 'NOT_COMPANY_MEMBER';
      throw error;
    }
  }

  // 4. If user belongs to a company, enforce tenant approval status
  if (authenticatedUser.company_id && authenticatedUser.role_name !== 'super_admin') {
    if (authenticatedUser.company_status === 'pending') {
      const error = new Error('Your workspace registration is waiting for approval by the super administrator. Please check back later.');
      error.statusCode = 403;
      error.code = 'APPROVAL_PENDING';
      throw error;
    }
    if (authenticatedUser.company_status === 'rejected') {
      const error = new Error('Your workspace registration request has been declined.');
      error.statusCode = 403;
      error.code = 'REGISTRATION_REJECTED';
      throw error;
    }
    if (authenticatedUser.company_status === 'suspended') {
      const error = new Error('Your company workspace account is currently suspended. Please contact platform administration.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_SUSPENDED';
      throw error;
    }
  }

  const access = await authRepository.findAccessByUserId(authenticatedUser.id);
  return { user: publicUser(authenticatedUser, access.permissions), token: createToken(authenticatedUser) };
}

async function listUsers({ includeSensitive = false, companyId = null, isSuperAdmin = false } = {}) {
  const rows = await authRepository.listUsers(companyId, isSuperAdmin);
  return Promise.all(rows.map(async (user) => {
    const access = await authRepository.findAccessByUserId(user.id);
    return includeSensitive ? publicUser(user, access.permissions) : sanitizeUserForPublicView(user);
  }));
}

async function getUserById(id, { companyId = null, isSuperAdmin = false } = {}) {
  const user = await authRepository.findById(id);
  if (!user) return null;
  if (!isSuperAdmin) {
    if (user.role_name === 'super_admin' || user.role === 'super_admin') return null;
    if (user.company_id && Number(user.company_id) !== Number(companyId)) return null;
  }
  const access = await authRepository.findAccessByUserId(user.id);
  return publicUser(user, access.permissions);
}

async function setRoleById(id, roleId, { companyId = null, isSuperAdmin = false } = {}) {
  const targetUser = await authRepository.findById(id);
  if (!targetUser) return null;
  if (!isSuperAdmin) {
    if (targetUser.role_name === 'super_admin' || targetUser.role === 'super_admin') {
      const error = new Error('Cannot modify super admin account.');
      error.statusCode = 403;
      throw error;
    }
    if (targetUser.company_id && Number(targetUser.company_id) !== Number(companyId)) {
      const error = new Error('Cannot modify user from another company.');
      error.statusCode = 403;
      throw error;
    }
  }

  const role = (await listRoles()).find((item) => item.id === Number(roleId));
  if (!role) {
    const error = new Error('Invalid role.');
    error.statusCode = 400;
    throw error;
  }
  if (!isSuperAdmin && role.name === 'super_admin') {
    const error = new Error('Cannot assign super admin role.');
    error.statusCode = 403;
    throw error;
  }

  const user = await authRepository.setRoleById(id, role.id);
  return user ? publicUser(user, (await authRepository.findAccessByUserId(user.id)).permissions) : null;
}

async function updateUser(id, input, { companyId = null, isSuperAdmin = false } = {}) {
  const targetUser = await authRepository.findById(id);
  if (!targetUser) return null;
  if (!isSuperAdmin) {
    if (targetUser.role_name === 'super_admin' || targetUser.role === 'super_admin') {
      const error = new Error('Cannot modify super admin account.');
      error.statusCode = 403;
      throw error;
    }
    if (targetUser.company_id && Number(targetUser.company_id) !== Number(companyId)) {
      const error = new Error('Cannot modify user from another company.');
      error.statusCode = 403;
      throw error;
    }
  }
  const username = typeof input?.username === 'string' ? input.username.trim() : '';
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  const profileImagePath = input?.profileImagePath === null ? null : (typeof input?.profileImagePath === 'string' && input.profileImagePath.trim() ? input.profileImagePath.trim() : undefined);
  const originalEmail = input?.originalEmail !== undefined ? (typeof input?.originalEmail === 'string' ? input.originalEmail.trim().toLowerCase() || null : null) : undefined;
  if (!username || !/^\S+@\S+\.\S+$/.test(email)) {
    const error = new Error('A valid username and email address are required.');
    error.statusCode = 400;
    throw error;
  }
  if (password && password.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }
  try {
    const currentUser = await authRepository.findById(id);
    const user = await authRepository.updateUser(id, {
      username,
      email,
      passwordHash: password ? await bcrypt.hash(password, 12) : undefined,
      profileImagePath,
      originalEmail
    });
    if (currentUser?.profile_image_path && shouldReplaceProfileImage(currentUser.profile_image_path, profileImagePath)) {
      await deleteOldProfileImageIfNeeded(currentUser, profileImagePath);
    }
    return user ? publicUser(user, (await authRepository.findAccessByUserId(user.id)).permissions) : null;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') { error.statusCode = 409; error.message = 'That email address is already registered.'; }
    throw error;
  }
}

async function updateProfile(id, input) {
  const username = typeof input?.username === 'string' ? input.username.trim() : '';
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  const profileImagePath = input?.profileImagePath === null ? null : (typeof input?.profileImagePath === 'string' && input.profileImagePath.trim() ? input.profileImagePath.trim() : undefined);

  if (!username || !/^\S+@\S+\.\S+$/.test(email)) {
    const error = new Error('A valid username and email address are required.');
    error.statusCode = 400;
    throw error;
  }

  if (password && password.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  try {
    const currentUser = await authRepository.findById(id);
    const user = await authRepository.updateProfile(id, {
      username,
      email,
      passwordHash: password ? await bcrypt.hash(password, 12) : undefined,
      profileImagePath
    });
    if (currentUser?.profile_image_path && shouldReplaceProfileImage(currentUser.profile_image_path, profileImagePath)) {
      await deleteOldProfileImageIfNeeded(currentUser, profileImagePath);
    }
    return user ? publicUser(user, (await authRepository.findAccessByUserId(user.id)).permissions) : null;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') { error.statusCode = 409; error.message = 'That email address is already registered.'; }
    throw error;
  }
}

async function getAccess(id) {
  return authRepository.findAccessByUserId(id);
}

async function listPermissions() {
  return authRepository.listPermissions();
}

function shapeRoles(rows) {
  const roleMap = new Map();
  for (const row of rows) {
    if (!roleMap.has(row.id)) {
      roleMap.set(row.id, {
        id: Number(row.id),
        name: row.name,
        description: row.description || '',
        companyId: row.company_id ? Number(row.company_id) : null,
        permissions: []
      });
    }
    if (row.permission) roleMap.get(row.id).permissions.push(row.permission);
  }
  return [...roleMap.values()];
}

async function listRoles(companyId = null, isSuperAdmin = false) {
  const roles = shapeRoles(await authRepository.listRoles(companyId, isSuperAdmin));
  if (!isSuperAdmin) {
    return roles.filter((role) => role.name !== 'super_admin');
  }
  return roles;
}

async function validateRoleInput(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const description = typeof input?.description === 'string' ? input.description.trim() : '';
  const permissions = Array.isArray(input?.permissions) ? input.permissions.filter((permission) => typeof permission === 'string') : [];
  if (!name) {
    const error = new Error('Role name is required.');
    error.statusCode = 400;
    throw error;
  }
  const knownPermissions = new Set((await listPermissions()).map((permission) => permission.name));
  if (permissions.some((permission) => !knownPermissions.has(permission))) {
    const error = new Error('One or more selected permissions do not exist.');
    error.statusCode = 400;
    throw error;
  }
  return { name, description, permissions };
}

async function createRole(input, { companyId = null, isSuperAdmin = false } = {}) {
  const role = await validateRoleInput(input);
  if (role.name === 'super_admin') {
    const error = new Error('Cannot create a role named super_admin.');
    error.statusCode = 403;
    throw error;
  }
  try {
    const targetCompanyId = isSuperAdmin ? (input?.companyId ? Number(input.companyId) : null) : Number(companyId);
    const id = await authRepository.createRole({ ...role, companyId: targetCompanyId });
    return (await listRoles(targetCompanyId, isSuperAdmin)).find((item) => item.id === Number(id));
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      error.statusCode = 409;
      error.message = 'That role already exists for your company.';
    }
    throw error;
  }
}

async function updateRole(id, input, { companyId = null, isSuperAdmin = false } = {}) {
  const allRoles = await listRoles(companyId, isSuperAdmin);
  const targetRole = allRoles.find((item) => item.id === Number(id));

  if (!targetRole) {
    const error = new Error('Role not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  if (!isSuperAdmin && (targetRole.companyId === null || ['super_admin', 'admin', 'user'].includes(targetRole.name))) {
    const error = new Error('Built-in system default roles cannot be modified.');
    error.statusCode = 403;
    throw error;
  }

  const role = await validateRoleInput(input);
  await authRepository.updateRole(id, role);
  return (await listRoles(companyId, isSuperAdmin)).find((item) => item.id === Number(id)) || null;
}

async function deleteRole(id, { companyId = null, isSuperAdmin = false } = {}) {
  const allRoles = await listRoles(companyId, isSuperAdmin);
  const targetRole = allRoles.find((item) => item.id === Number(id));

  if (!targetRole) {
    const error = new Error('Role not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  if (!isSuperAdmin && (targetRole.companyId === null || ['super_admin', 'admin', 'user'].includes(targetRole.name))) {
    const error = new Error(`The built-in '${targetRole.name}' role cannot be deleted.`);
    error.statusCode = 403;
    throw error;
  }

  const userCount = await authRepository.countUsersForRole(id);
  if (userCount > 0) {
    const error = new Error('Reassign all users before deleting this role.');
    error.statusCode = 409;
    throw error;
  }
  return await authRepository.deleteRole(id);
}

async function createUser(input, { companyId = null, isSuperAdmin = false } = {}) {
  const username = typeof input?.username === 'string' ? input.username.trim() : '';
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  const roleId = input?.roleId ? Number(input.roleId) : null;
  const profileImagePath = input?.profileImagePath || null;
  const originalEmail = typeof input?.originalEmail === 'string' ? input.originalEmail.trim().toLowerCase() : null;
  const targetCompanyId = isSuperAdmin ? (input?.companyId ? Number(input.companyId) : null) : Number(companyId);

  if (!username || !email || password.length < 8) {
    const error = new Error('Username, email, and a password of at least 8 characters are required.');
    error.statusCode = 400;
    throw error;
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    const error = new Error('A valid email address is required.');
    error.statusCode = 400;
    throw error;
  }

  let assignedRoleId = roleId;
  if (!assignedRoleId) {
    const roles = await listRoles(isSuperAdmin);
    const userRole = roles.find((r) => r.name === 'user');
    assignedRoleId = userRole?.id || roles[0]?.id;
  }

  try {
    const user = await authRepository.createWithRole({
      username,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      profileImagePath,
      originalEmail,
      companyId: targetCompanyId,
      roleId: assignedRoleId
    });
    const access = await authRepository.findAccessByUserId(user.id);
    return publicUser(user, access.permissions);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      error.statusCode = 409;
      error.message = 'That email address is already registered.';
    }
    throw error;
  }
}

async function registerCompanyWorkspace(input, req = null) {
  const companyService = require('../companies/company.service');
  const companyName = typeof input?.companyName === 'string' ? input.companyName.trim() : '';
  const adminEmail = typeof input?.workEmail === 'string' ? input.workEmail.trim().toLowerCase() : (typeof input?.adminEmail === 'string' ? input.adminEmail.trim().toLowerCase() : '');
  const adminUsername = typeof input?.fullName === 'string' ? input.fullName.trim() : (typeof input?.adminUsername === 'string' ? input.adminUsername.trim() : '');
  const adminPassword = typeof input?.password === 'string' ? input.password : (typeof input?.adminPassword === 'string' ? input.adminPassword : '');

  if (!companyName || !adminEmail || !adminUsername) {
    const error = new Error('Company name, valid work email, and full name are required.');
    error.statusCode = 400;
    throw error;
  }

  // Keep emailDomain empty for consumer domains (e.g. gmail.com, yahoo.com, hotmail.com, outlook.com)
  let emailDomain = null;
  if (adminEmail.includes('@')) {
    const parts = adminEmail.split('@')[1].toLowerCase();
    const commonPublic = ['gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'mail.com'];
    if (!commonPublic.includes(parts)) {
      emailDomain = '@' + parts;
    }
  }

  try {
    const planId = input?.planId || 'trial';
    const createdWorkspace = await companyService.createCompanyWithAdmin({
      companyName,
      adminEmail,
      adminUsername,
      adminPassword,
      emailDomain,
      planId,
      status: 'pending' // Creates tenant in pending status awaiting Super Admin approval
    });

    // Real-time broadcast to all connected Super Admins
    try {
      const notificationsController = require('../notifications/notifications.controller');
      notificationsController.sendToSuperAdmins('workspace_registered', {
        company: createdWorkspace.company,
        message: `New workspace registration received: ${createdWorkspace.company.name}`
      });
    } catch (e) {
      console.warn('Failed to broadcast workspace_registered event:', e);
    }

    // 1. First Priority: Send Successful Workspace Registration Confirmation Email to the registered user
    try {
      const mailService = require('../../services/mail.service');
      const { buildDynamicClientUrl } = require('../../services/mail/mail.links');

      await mailService.sendWorkspaceRegistrationEmail({
        recipientEmail: adminEmail,
        recipientName: adminUsername,
        companyName,
        planId
      });

      // 2. Also notify the Super Admin of the new registration request
      const superAdminEmail = (smtp.adminNotificationEmail || 'gondalzain717@gmail.com').trim();
      const reviewUrl = buildDynamicClientUrl(null, '/super-admin/approvals', {}, req);
      await mailService.sendAdminNewRegistrationNotification({
        adminEmail: superAdminEmail,
        applicantName: adminUsername,
        applicantEmail: adminEmail,
        companyName,
        planId,
        reviewUrl
      });
    } catch (e) {
      console.warn('Failed to dispatch workspace registration emails:', e);
    }

    return {
      success: true,
      status: 'pending',
      message: 'Workspace registration submitted successfully. Your account is waiting for approval by the super administrator.',
      company: {
        id: createdWorkspace.company.id,
        name: createdWorkspace.company.name,
        status: createdWorkspace.company.status
      }
    };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      error.statusCode = 409;
      error.message = 'An account or workspace with that email address is already registered.';
    }
    throw error;
  }
}

async function handleInboundEmailRegistration(inboundPayload, req) {
  const { parseInboundEmailContent } = require('../../services/mail/mail.reply-parser');
  
  // Resend webhook payload can be structured as { type: 'email.received', data: { from, to, subject, text, html } }
  // or a direct JSON object { from, to, subject, text, html }
  const emailData = (inboundPayload.data && typeof inboundPayload.data === 'object')
    ? inboundPayload.data
    : inboundPayload;

  let fromField = emailData.from || emailData.sender || '';
  let subjectField = emailData.subject || '';
  let textField = emailData.text || '';
  let htmlField = emailData.html || '';

  // If Resend sends an email.received event with an email_id, fetch the full content from Resend Receiving API
  if (emailData.email_id && (!textField || !htmlField)) {
    try {
      const apiKey = smtp.resendApiKey || smtp.pass;
      const resp = await fetch(`https://api.resend.com/emails/receiving/${emailData.email_id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (resp.ok) {
        const fullEmail = await resp.json();
        fromField = fullEmail.from || fromField;
        subjectField = fullEmail.subject || subjectField;
        textField = fullEmail.text || textField;
        htmlField = fullEmail.html || htmlField;
        console.log(`[Inbound] Fetched full email content for email_id=${emailData.email_id}`);
      }
    } catch (fetchErr) {
      console.warn(`[Inbound] Could not fetch email content from Resend API for email_id=${emailData.email_id}:`, fetchErr.message);
    }
  }

  const parsed = parseInboundEmailContent({
    from: fromField,
    subject: subjectField,
    text: textField,
    html: htmlField
  });

  console.log('\n================== [INBOUND EMAIL RECEIVED] ==================');
  console.log(`[Inbound] Sender: ${parsed.senderEmail} (${parsed.senderName})`);
  console.log(`[Inbound] Detected Company Name: "${parsed.companyName}"`);
  console.log(`[Inbound] Detected Contact Name: "${parsed.fullName}"`);
  console.log(`[Inbound] Selected Plan: ${parsed.planId}`);
  console.log('==============================================================\n');

  if (!parsed.senderEmail || !parsed.senderEmail.includes('@')) {
    const error = new Error('Could not identify a valid sender email address from inbound payload.');
    error.statusCode = 400;
    throw error;
  }

  // Auto-register workspace via standard registration engine
  const registrationResult = await registerCompanyWorkspace({
    companyName: parsed.companyName,
    workEmail: parsed.senderEmail,
    fullName: parsed.fullName,
    planId: parsed.planId
  }, req);

  // Link back to marketing_invitations table if found
  try {
    const { pool } = require('../../config/database');
    await pool.execute(
      `UPDATE marketing_invitations 
       SET status = 'registered',
           registered_company_id = ?,
           registered_company_name = ?,
           reply_content = ?,
           replied_at = NOW()
       WHERE recipient_email = ? AND status = 'sent'
       ORDER BY sent_at DESC LIMIT 1`,
      [registrationResult.company.id, parsed.companyName, parsed.rawReply || null, parsed.senderEmail]
    );
  } catch (mErr) {
    console.warn('[Marketing] Could not update invitation status on reply:', mErr.message);
  }

  return {
    success: true,
    autoRegistered: true,
    parsed,
    company: registrationResult.company,
    message: `Workspace "${parsed.companyName}" successfully auto-registered for ${parsed.senderEmail} via email reply.`
  };
}
async function verifyPasswordToken(token) {
  if (!token || typeof token !== 'string') {
    const error = new Error('Invalid or missing password setup token.');
    error.statusCode = 400;
    throw error;
  }

  const user = await authRepository.findByPasswordResetToken(token);
  if (!user) {
    const error = new Error('This password creation link is invalid or has expired.');
    error.statusCode = 400;
    throw error;
  }

  return {
    valid: true,
    email: user.email,
    username: user.username,
    company: {
      id: user.company_id,
      name: user.company_name,
      domain: user.company_domain,
      primaryColor: user.company_primary_color,
      secondaryColor: user.company_secondary_color,
      logoPath: user.company_logo_path
    }
  };
}

async function createPasswordWithToken({ token, password }, req = null) {
  if (!token || typeof token !== 'string') {
    const error = new Error('Invalid or missing setup token.');
    error.statusCode = 400;
    throw error;
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  const user = await authRepository.findByPasswordResetToken(token);
  if (!user) {
    const error = new Error('This password creation link is invalid or has expired.');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const updatedUser = await authRepository.setPasswordWithToken(user.id, passwordHash);

  // Step 3 of Flow: Send Custom Portal Access Email to the User once password is set
  try {
    const mailService = require('../../services/mail.service');
    const { buildDynamicClientUrl } = require('../../services/mail/mail.links');
    const portalLoginUrl = buildDynamicClientUrl(user.company_domain, '/login', {}, req);

    await mailService.sendWorkspacePortalAccessEmail({
      recipientEmail: user.email,
      recipientName: user.username,
      companyName: user.company_name,
      domain: user.company_domain,
      loginUrl: portalLoginUrl
    });
  } catch (e) {
    console.warn('Failed to dispatch portal access email:', e);
  }

  return {
    success: true,
    message: 'Password created successfully! You can now sign in to your company portal.',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username
    },
    company: {
      id: user.company_id,
      name: user.company_name,
      domain: user.company_domain
    }
  };
}

async function lookupCompany(query) {
  const companyRepository = require('../companies/company.repository');
  return companyRepository.findPublicCompanyByQuery(query);
}

module.exports = {
  handleInboundEmailRegistration,
  register,
  login,
  createUser,
  listUsers,
  getUserById,
  setRoleById,
  updateUser,
  updateProfile,
  getAccess,
  listPermissions,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  sanitizeUserForPublicView,
  lookupCompany,
  registerCompanyWorkspace,
  verifyPasswordToken,
  createPasswordWithToken
};
