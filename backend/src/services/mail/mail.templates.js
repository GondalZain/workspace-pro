// @ts-nocheck
const { wrapFormalEmailTemplate } = require('./mail.layout');

/**
 * Helper to format a URL safely for Gmail primary inbox delivery.
 * Localhost (`http://localhost...` or `*.localhost`) links inside `<a href>` buttons
 * are flagged by Gmail's anti-phishing filter when sent from an external domain.
 * For localhost URLs, we render a clean copyable link block; for public HTTPS domains, we render a standard link.
 */
function renderSafeActionUrl(label, url) {
  if (!url) return '';
  const isLocalhost = /^https?:\/\/([a-z0-9-]+\.)?localhost(:\d+)?/i.test(url) || /^https?:\/\/127\.0\.0\.1/i.test(url);

  if (isLocalhost) {
    return `
      <div style="margin: 18px 0; padding: 14px 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 6px;">${label}:</div>
        <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #0f766e; word-break: break-all;">
          ${url}
        </div>
      </div>
    `;
  }

  return `
    <p style="margin: 20px 0;">
      <a href="${url}" style="display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #0f766e; text-decoration: none; border-radius: 6px;">
        ${label}
      </a>
    </p>
    <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280; word-break: break-all;">
      Direct link: ${url}
    </p>
  `;
}

function formatSafeCompanyName(name) {
  const clean = String(name || 'Your Workspace').trim();
  if (clean === clean.toUpperCase() && clean.length > 3) {
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  }
  return clean;
}

/**
 * 1. Workspace Registration Confirmation Template (First Priority - Sent to Registered User)
 */
function buildRegistrationTemplate({ recipientEmail, recipientName, companyName, planId = 'trial' }) {
  const planMap = {
    trial: 'Standard Plan',
    pro: 'Pro Workspace Plan',
    monthly: 'Pro Workspace Plan',
    ultra: 'Ultra Workspace Plan'
  };
  const planDisplayName = planMap[String(planId).toLowerCase()] || 'Standard Plan';
  const submittedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const displayCompany = formatSafeCompanyName(companyName);
  const subject = `Registration received: ${displayCompany} Workspace`;

  const bodyContent = `
    <p style="margin: 0 0 14px 0; color: #111827;">Hi <strong>${recipientName || 'there'}</strong>,</p>

    <p style="margin: 0 0 16px 0;">
      Thank you for registering your workspace with <strong>Workspace Pro</strong>. We have received the registration request submitted by <strong>${recipientName || 'Administrator'}</strong> (${recipientEmail}) for <strong>${displayCompany}</strong>.
    </p>

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 18px; margin: 18px 0;">
      <div style="font-size: 13px; font-weight: 600; color: #0f766e; margin-bottom: 10px;">
        Registration Summary
      </div>
      <div style="font-size: 14px; line-height: 1.75; color: #374151;">
        <div><strong>Workspace Name:</strong> ${displayCompany}</div>
        <div><strong>Registered Name:</strong> ${recipientName || 'Workspace Administrator'}</div>
        <div><strong>Registered Email:</strong> ${recipientEmail}</div>
        <div><strong>Selected Tier:</strong> ${planDisplayName}</div>
        <div><strong>Submitted Date:</strong> ${submittedAt}</div>
        <div><strong>Status:</strong> Pending Review</div>
      </div>
    </div>

    <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">Next steps for your workspace:</p>
    <p style="margin: 0 0 16px 0;">
      1. Our administrator will review your request for <strong>${displayCompany}</strong> and assign your dedicated workspace portal domain.<br />
      2. As soon as your workspace is approved, we will send a follow-up email to <strong>${recipientEmail}</strong> with your portal setup link.<br />
      3. You can then choose your password and sign in to your company workspace.
    </p>

    <p style="margin: 18px 0 0 0; color: #111827;">
      Warm regards,<br />
      <strong>Workspace Pro Team</strong>
    </p>
  `;

  const text = [
    `Hi ${recipientName || 'there'},`,
    '',
    `Thank you for registering your workspace with Workspace Pro. We have received the registration request submitted by ${recipientName || 'Administrator'} (${recipientEmail}) for ${displayCompany}.`,
    '',
    'Registration Summary:',
    `- Workspace Name: ${displayCompany}`,
    `- Registered Name: ${recipientName || 'Workspace Administrator'}`,
    `- Registered Email: ${recipientEmail}`,
    `- Selected Tier: ${planDisplayName}`,
    `- Submitted Date: ${submittedAt}`,
    '- Status: Pending Review',
    '',
    'Next steps for your workspace:',
    `1. Our administrator will review your request for ${displayCompany} and assign your dedicated workspace portal domain.`,
    `2. As soon as your workspace is approved, we will send a follow-up email to ${recipientEmail} with your portal setup link.`,
    '3. You can then choose your password and sign in to your company workspace.',
    '',
    'Warm regards,',
    'Workspace Pro Team'
  ].join('\n');

  const html = wrapFormalEmailTemplate({
    headerTitle: 'Registration Confirmed',
    headerSubtitle: `Prepared for ${recipientName || 'Administrator'} (${recipientEmail}) - ${displayCompany}`,
    bodyContent,
    recipientEmail
  });

  return { subject, html, text };
}

/**
 * 1b. Super Admin Notification Template: New Workspace Submitted
 */
function buildAdminNewRegistrationNoticeTemplate({ adminEmail, applicantName, applicantEmail, companyName, planId = 'trial', reviewUrl }) {
  const planMap = {
    trial: 'Standard Trial (30 Days)',
    pro: 'Pro Workspace Plan',
    monthly: 'Pro Workspace Plan',
    ultra: 'Ultra Workspace Plan'
  };
  const planDisplayName = planMap[String(planId).toLowerCase()] || 'Standard Trial (30 Days)';
  const submittedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const subject = `New workspace request for ${companyName} (${applicantName})`;

  const bodyContent = `
    <p style="margin: 0 0 14px 0; color: #111827;">Hi <strong>Administrator</strong>,</p>

    <p style="margin: 0 0 16px 0;">
      A new workspace registration has been submitted on <strong>Workspace Pro</strong> by <strong>${applicantName || 'Workspace Admin'}</strong> (${applicantEmail}) for <strong>${companyName}</strong>.
    </p>

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 18px; margin: 18px 0;">
      <div style="font-size: 13px; font-weight: 600; color: #0f766e; margin-bottom: 10px;">
        Applicant and Workspace Details
      </div>
      <div style="font-size: 14px; line-height: 1.75; color: #374151;">
        <div><strong>Workspace Name:</strong> ${companyName}</div>
        <div><strong>Applicant Name:</strong> ${applicantName || 'Workspace Administrator'}</div>
        <div><strong>Applicant Email:</strong> ${applicantEmail}</div>
        <div><strong>Selected Plan:</strong> ${planDisplayName}</div>
        <div><strong>Submitted Date:</strong> ${submittedAt}</div>
      </div>
    </div>

    <p style="margin: 0 0 12px 0;">
      You can assign a workspace domain and approve this request from the Approvals page in your Super Admin dashboard.
    </p>

    ${renderSafeActionUrl('Super Admin Approvals Dashboard', reviewUrl)}

    <p style="margin: 18px 0 0 0; color: #111827;">
      Warm regards,<br />
      <strong>Workspace Pro Team</strong>
    </p>
  `;

  const text = [
    'Hi Administrator,',
    '',
    `A new workspace registration has been submitted on Workspace Pro by ${applicantName} (${applicantEmail}) for ${companyName}.`,
    '',
    'Applicant and Workspace Details:',
    `- Workspace Name: ${companyName}`,
    `- Applicant Name: ${applicantName}`,
    `- Applicant Email: ${applicantEmail}`,
    `- Selected Plan: ${planDisplayName}`,
    `- Submitted Date: ${submittedAt}`,
    '',
    `Super Admin Approvals Dashboard: ${reviewUrl || ''}`,
    '',
    'Warm regards,',
    'Workspace Pro Team'
  ].join('\n');

  const html = wrapFormalEmailTemplate({
    headerTitle: 'New Workspace Registration Request',
    headerSubtitle: `Submitted by ${applicantName} (${applicantEmail}) - ${companyName}`,
    bodyContent,
    recipientEmail: adminEmail
  });

  return { subject, html, text };
}

/**
 * 2. Workspace Approval & Account Setup Template
 */
function buildApprovalTemplate({ recipientEmail, recipientName, companyName, domain, createPasswordUrl }) {
  const displayCompany = formatSafeCompanyName(companyName);
  const subject = `Your ${displayCompany} workspace is ready on Workspace Pro`;

  const bodyContent = `
    <p style="margin: 0 0 14px 0; color: #111827;">Hi <strong>${recipientName || 'there'}</strong>,</p>

    <p style="margin: 0 0 16px 0;">
      Your workspace request for <strong>${displayCompany}</strong> submitted under <strong>${recipientEmail}</strong> has been approved and provisioned.
    </p>

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 18px; margin: 18px 0;">
      <div style="font-size: 13px; font-weight: 600; color: #0f766e; margin-bottom: 10px;">
        Approved Workspace Details
      </div>
      <div style="font-size: 14px; line-height: 1.75; color: #374151;">
        <div><strong>Workspace Name:</strong> ${displayCompany}</div>
        <div><strong>Administrator Name:</strong> ${recipientName || 'Workspace Administrator'}</div>
        <div><strong>Registered Email:</strong> ${recipientEmail}</div>
        <div><strong>Assigned Domain:</strong> ${domain || 'Standard Workspace Portal'}</div>
        <div><strong>Status:</strong> Approved and Active</div>
      </div>
    </div>

    <p style="margin: 0 0 12px 0;">
      To complete your administrator setup and choose your account password, open the setup address below in your browser:
    </p>

    ${renderSafeActionUrl('Complete Workspace Account Setup', createPasswordUrl)}

    <p style="margin: 18px 0 0 0; color: #111827;">
      Warm regards,<br />
      <strong>Workspace Pro Team</strong>
    </p>
  `;

  const text = [
    `Hi ${recipientName || 'there'},`,
    '',
    `Your workspace request for ${companyName} submitted under ${recipientEmail} has been approved and provisioned.`,
    '',
    'Approved Workspace Details:',
    `- Workspace Name: ${companyName}`,
    `- Administrator Name: ${recipientName || 'Workspace Administrator'}`,
    `- Registered Email: ${recipientEmail}`,
    `- Assigned Domain: ${domain || 'Standard Workspace Portal'}`,
    '- Status: Approved and Active',
    '',
    'Open the setup link below to choose your account password:',
    `${createPasswordUrl || ''}`,
    '',
    'Warm regards,',
    'Workspace Pro Team'
  ].join('\n');

  const html = wrapFormalEmailTemplate({
    headerTitle: `${companyName} Workspace Approved`,
    headerSubtitle: `Prepared for ${recipientName || 'Administrator'} (${recipientEmail})`,
    bodyContent,
    recipientEmail
  });

  return { subject, html, text };
}

/**
 * 3. Custom Portal Access Ready Template
 */
function buildPortalAccessTemplate({ recipientEmail, recipientName, companyName, domain, loginUrl }) {
  const displayCompany = formatSafeCompanyName(companyName);
  const subject = `Your ${displayCompany} portal details on Workspace Pro`;

  const bodyContent = `
    <p style="margin: 0 0 14px 0; color: #111827;">Hi <strong>${recipientName || 'there'}</strong>,</p>

    <p style="margin: 0 0 16px 0;">
      Your account setup for <strong>${displayCompany}</strong> is complete and your dedicated workspace portal is ready.
    </p>

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 18px; margin: 18px 0;">
      <div style="font-size: 13px; font-weight: 600; color: #0f766e; margin-bottom: 10px;">
        Workspace Portal Details
      </div>
      <div style="font-size: 14px; line-height: 1.75; color: #374151;">
        <div><strong>Workspace Name:</strong> ${displayCompany}</div>
        <div><strong>Portal Domain:</strong> ${domain || 'Standard Workspace Portal'}</div>
        <div><strong>Registered Email:</strong> ${recipientEmail}</div>
      </div>
    </div>

    ${renderSafeActionUrl('Workspace Portal Sign-In Address', loginUrl)}

    <p style="margin: 18px 0 0 0; color: #111827;">
      Warm regards,<br />
      <strong>Workspace Pro Team</strong>
    </p>
  `;

  const text = [
    `Hi ${recipientName || 'there'},`,
    '',
    `Your account setup for ${companyName} is complete and your dedicated workspace portal is ready.`,
    '',
    'Workspace Portal Details:',
    `- Workspace Name: ${companyName}`,
    `- Portal Domain: ${domain || 'Standard Workspace Portal'}`,
    `- Registered Email: ${recipientEmail}`,
    '',
    `Workspace Portal Address: ${loginUrl || ''}`,
    '',
    'Warm regards,',
    'Workspace Pro Team'
  ].join('\n');

  const html = wrapFormalEmailTemplate({
    headerTitle: `${companyName} Portal Active`,
    headerSubtitle: `Prepared for ${recipientName || 'Administrator'} (${recipientEmail})`,
    bodyContent,
    recipientEmail
  });

  return { subject, html, text };
}


/**
 * Marketing / Direct Invitation Email Template with Reply-To-Register Call-to-Action
 */
function buildMarketingInvitationTemplate({ recipientEmail, customMessage }) {
  const subject = `You're invited to Workspace Pro — Just reply to create your workspace`;

  const bodyContent = `
    <p style="margin: 0 0 14px 0; color: #111827;">Hello,</p>

    <p style="margin: 0 0 16px 0;">
      ${customMessage || `You are invited to experience <strong>Workspace Pro</strong> — the all-in-one platform for managing tasks, project roadmaps, Kanban sprints, and team productivity in real time.`}
    </p>

    <div style="background-color: #f0fdfa; border: 2px dashed #0f766e; border-radius: 8px; padding: 20px; margin: 22px 0;">
      <div style="font-size: 15px; font-weight: 700; color: #0f766e; margin-bottom: 8px;">
        ⚡ Instant Setup: Just Reply to this Email!
      </div>
      <p style="margin: 0 0 12px 0; font-size: 13.5px; color: #374151; line-height: 1.6;">
        No need to fill out any website forms. Simply click <strong>Reply</strong> in your email app, type your details, and hit send:
      </p>

      <div style="background-color: #ffffff; border: 1px solid #ccfbf1; border-radius: 6px; padding: 14px 16px; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 13.5px; color: #111827; line-height: 1.8;">
        Company: [Your Company Name]<br />
        Name: [Your Full Name]<br />
        Plan: Trial
      </div>

      <p style="margin: 12px 0 0 0; font-size: 12.5px; color: #64748b; line-height: 1.5;">
        <em>Example reply:</em><br />
        <code>Company: Apex Tech</code><br />
        <code>Name: Zain Gondal</code>
      </p>
    </div>

    <p style="margin: 0 0 12px 0; font-size: 13.5px; color: #475569;">
      As soon as your reply is received, our system will automatically register your workspace and notify you with your portal access!
    </p>

    <p style="margin: 20px 0 0 0; color: #111827;">
      Warm regards,<br />
      <strong>Workspace Pro Team</strong>
    </p>
  `;

  const text = [
    `Hello,`,
    '',
    customMessage || `You are invited to experience Workspace Pro for managing tasks, projects, and team productivity.`,
    '',
    `==================================================`,
    `⚡ INSTANT SETUP: JUST REPLY TO THIS EMAIL`,
    `==================================================`,
    `No forms needed! Simply click Reply and send:`,
    '',
    `Company: [Your Company Name]`,
    `Name: [Your Full Name]`,
    `Plan: Trial`,
    '',
    `Example:`,
    `Company: Apex Tech`,
    `Name: Zain Gondal`,
    '',
    `Our automated system will read your reply and register your company workspace immediately.`,
    '',
    `Warm regards,`,
    `Workspace Pro Team`
  ].join('\n');

  return {
    subject,
    html: wrapFormalEmailTemplate({
      headerTitle: 'Welcome to Workspace Pro',
      headerSubtitle: 'Exclusive Invitation & Workspace Provisioning',
      bodyContent,
      recipientEmail
    }),
    text
  };
}


/**
 * 4. Task Assignment Alert Template
 * Sent to the assignee's real/original notification email when assigned to a task.
 */
function buildTaskAssignedTemplate({
  recipientEmail,
  userLoginEmail,
  recipientName,
  taskTitle,
  taskDescription,
  actorName,
  companyName,
  companyPrimaryColor,
  priority,
  dueDate,
  category,
  projectName,
  taskUrl,
  companyLoginUrl
}) {
  const displayCompany = formatSafeCompanyName(companyName || 'Workspace Pro');
  const brandColor = companyPrimaryColor && /^#[0-9a-f]{3,8}$/i.test(companyPrimaryColor.trim())
    ? companyPrimaryColor.trim()
    : '#0f766e';
  const effectiveLoginUrl = companyLoginUrl || taskUrl;

  // Determine priority badge colors
  const normPriority = (priority || 'medium').toLowerCase();
  let priorityBg = '#fef3c7';
  let priorityColor = '#92400e';
  let priorityIcon = '🟡';
  let priorityLabel = 'Medium';

  if (normPriority === 'urgent' || normPriority === 'high') {
    priorityBg = '#fee2e2';
    priorityColor = '#991b1b';
    priorityIcon = '🔴';
    priorityLabel = normPriority === 'urgent' ? 'Urgent' : 'High';
  } else if (normPriority === 'low') {
    priorityBg = '#dcfce7';
    priorityColor = '#166534';
    priorityIcon = '🟢';
    priorityLabel = 'Low';
  }

  const subject = `[${displayCompany}] Task Assigned: ${taskTitle}`;
  const preheader = `${actorName || 'A team member'} assigned you to "${taskTitle}" in ${displayCompany} • Priority: ${priorityLabel}${dueDate ? ' • Due ' + dueDate : ''}`;

  const cleanDescription = (taskDescription || '').trim();

  const bodyContent = `
    <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">
      Hi <strong>${recipientName || 'there'}</strong>,
    </p>

    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      <strong>${actorName || 'A team member'}</strong> has assigned a new task to you in <strong>${displayCompany}</strong>.
    </p>

    <!-- Task Card -->
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid ${brandColor}; border-radius: 10px; padding: 22px 24px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
      
      <!-- Task Title -->
      <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 14px; line-height: 1.4;">
        ${taskTitle}
      </div>

      <!-- Metadata Badges -->
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; background-color: ${priorityBg}; color: ${priorityColor}; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 8px;">
          ${priorityIcon} ${priorityLabel} Priority
        </span>
        ${projectName ? `
          <span style="display: inline-block; background-color: #f1f5f9; color: #334155; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; margin-right: 8px;">
            📁 ${projectName}
          </span>
        ` : ''}
        ${category ? `
          <span style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 9999px;">
            🏷️ ${category}
          </span>
        ` : ''}
      </div>

      <!-- Task Details -->
      <div style="font-size: 14px; line-height: 1.8; color: #334155; padding-top: 14px; border-top: 1px dashed #e2e8f0;">
        <div><strong>👤 Assigned by:</strong> ${actorName || 'Team Admin'}</div>
        ${dueDate ? `<div><strong>📅 Due Date:</strong> <span style="color: #0f172a; font-weight: 600;">${dueDate}</span></div>` : ''}
        <div><strong>🏢 Workspace:</strong> ${displayCompany}</div>
      </div>

      <!-- Description Section -->
      ${cleanDescription ? `
        <div style="margin-top: 16px; padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">
            Task Description
          </div>
          <div style="font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${cleanDescription}</div>
        </div>
      ` : ''}
    </div>

    <!-- Action Button (CTA) -->
    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="${taskUrl}" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        Open Task in Workspace &rarr;
      </a>
    </div>

    <!-- Direct Company Portal Login Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 18px; margin: 20px 0; text-align: center;">
      <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
        Direct Company Login Portal
      </div>
      <div style="font-size: 13px; color: #64748b; margin-bottom: 12px;">
        Need to sign in? Access your dedicated <strong>${displayCompany}</strong> login page directly:
      </div>
      <div>
        <a href="${effectiveLoginUrl}" style="display: inline-block; background-color: #ffffff; color: ${brandColor}; border: 1.5px solid ${brandColor}; font-size: 13px; font-weight: 600; text-decoration: none; padding: 8px 20px; border-radius: 6px;">
          Sign In to ${displayCompany} Portal &rarr;
        </a>
      </div>
      <div style="font-size: 11px; color: #94a3b8; word-break: break-all; margin-top: 10px;">
        Direct Portal Link: <a href="${effectiveLoginUrl}" style="color: ${brandColor};">${effectiveLoginUrl}</a>
      </div>
    </div>

    <p style="margin: 22px 0 0 0; color: #334155; font-size: 14px;">
      Warm regards,<br />
      <strong>${displayCompany} Team</strong>
    </p>
  `;

  const text = [
    `Hi ${recipientName || 'there'},`,
    '',
    `${actorName || 'A team member'} has assigned a new task to you in ${displayCompany}: "${taskTitle}".`,
    '',
    `Priority: ${priorityLabel}`,
    projectName ? `Project: ${projectName}` : '',
    dueDate ? `Due Date: ${dueDate}` : '',
    category ? `Category: ${category}` : '',
    cleanDescription ? `\nDescription:\n${cleanDescription}` : '',
    '',
    `Open Task: ${taskUrl || ''}`,
    `Company Login Portal: ${effectiveLoginUrl}`,
    '',
    `Warm regards,`,
    `${displayCompany} Team`
  ].filter(Boolean).join('\n');

  const html = wrapFormalEmailTemplate({
    headerTitle: 'Task Assignment',
    headerSubtitle: `Prepared for ${recipientName || 'Team Member'} (${recipientEmail})`,
    bodyContent,
    recipientEmail,
    brandColor,
    brandName: displayCompany,
    preheader
  });

  return { subject, html, text };
}

/**
 * 5. Task Updated Alert Template
 * Sent to involved users (assignees, creator) when someone updates a task.
 */
function buildTaskUpdatedTemplate({
  recipientEmail,
  userLoginEmail,
  recipientName,
  taskTitle,
  updateSummary,
  taskDescription,
  actorName,
  companyName,
  companyPrimaryColor,
  status,
  priority,
  dueDate,
  category,
  projectName,
  taskUrl,
  companyLoginUrl
}) {
  const displayCompany = formatSafeCompanyName(companyName || 'Workspace Pro');
  const brandColor = companyPrimaryColor && /^#[0-9a-f]{3,8}$/i.test(companyPrimaryColor.trim())
    ? companyPrimaryColor.trim()
    : '#0f766e';
  const effectiveLoginUrl = companyLoginUrl || taskUrl;
  const subject = `[${displayCompany}] Task Updated: ${taskTitle}`;
  const preheader = `${actorName || 'A team member'} updated "${taskTitle}" in ${displayCompany}: ${updateSummary}`;

  // Determine priority badge colors
  const normPriority = (priority || 'medium').toLowerCase();
  let priorityBg = '#fef3c7';
  let priorityColor = '#92400e';
  let priorityIcon = '🟡';
  let priorityLabel = 'Medium';

  if (normPriority === 'urgent' || normPriority === 'high') {
    priorityBg = '#fee2e2';
    priorityColor = '#991b1b';
    priorityIcon = '🔴';
    priorityLabel = normPriority === 'urgent' ? 'Urgent' : 'High';
  } else if (normPriority === 'low') {
    priorityBg = '#dcfce7';
    priorityColor = '#166534';
    priorityIcon = '🟢';
    priorityLabel = 'Low';
  }

  const cleanDescription = (taskDescription || '').trim();

  const bodyContent = `
    <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px;">
      Hi <strong>${recipientName || 'there'}</strong>,
    </p>

    <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      <strong>${actorName || 'A team member'}</strong> updated a task you are involved with in <strong>${displayCompany}</strong>.
    </p>

    <!-- Update Summary Banner -->
    <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-left: 4px solid ${brandColor}; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${brandColor}; margin-bottom: 4px;">
        Update Summary
      </div>
      <div style="font-size: 14px; font-weight: 600; color: #0f172a;">
        ${updateSummary || 'Task details were updated'}
      </div>
    </div>

    <!-- Task Card -->
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px 22px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
      
      <!-- Task Title -->
      <div style="font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 12px; line-height: 1.4;">
        ${taskTitle}
      </div>

      <!-- Metadata Badges -->
      <div style="margin-bottom: 14px;">
        ${status ? `
          <span style="display: inline-block; background-color: #f1f5f9; color: #334155; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; margin-right: 8px;">
            Status: ${status}
          </span>
        ` : ''}
        <span style="display: inline-block; background-color: ${priorityBg}; color: ${priorityColor}; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 8px;">
          ${priorityIcon} ${priorityLabel}
        </span>
        ${projectName ? `
          <span style="display: inline-block; background-color: #f1f5f9; color: #334155; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; margin-right: 8px;">
            📁 ${projectName}
          </span>
        ` : ''}
        ${category ? `
          <span style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 9999px;">
            🏷️ ${category}
          </span>
        ` : ''}
      </div>

      <!-- Task Details -->
      <div style="font-size: 14px; line-height: 1.8; color: #334155; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
        <div><strong>👤 Updated by:</strong> ${actorName || 'Team Admin'}</div>
        ${dueDate ? `<div><strong>📅 Due Date:</strong> <span style="color: #0f172a; font-weight: 600;">${dueDate}</span></div>` : ''}
        <div><strong>🏢 Workspace:</strong> ${displayCompany}</div>
      </div>

      <!-- Description Section -->
      ${cleanDescription ? `
        <div style="margin-top: 14px; padding: 12px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">
            Current Description
          </div>
          <div style="font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${cleanDescription}</div>
        </div>
      ` : ''}
    </div>

    <!-- Action Button (CTA) -->
    <div style="text-align: center; margin: 26px 0 16px 0;">
      <a href="${taskUrl}" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        View Updated Task &rarr;
      </a>
    </div>

    <!-- Direct Company Portal Login Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 18px 0; text-align: center;">
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
        Need to sign in first? Open your dedicated <strong>${displayCompany}</strong> login portal:
      </div>
      <div>
        <a href="${effectiveLoginUrl}" style="display: inline-block; background-color: #ffffff; color: ${brandColor}; border: 1.5px solid ${brandColor}; font-size: 13px; font-weight: 600; text-decoration: none; padding: 7px 18px; border-radius: 6px;">
          Sign In to ${displayCompany} &rarr;
        </a>
      </div>
      <div style="font-size: 11px; color: #94a3b8; word-break: break-all; margin-top: 8px;">
        Portal Link: <a href="${effectiveLoginUrl}" style="color: ${brandColor};">${effectiveLoginUrl}</a>
      </div>
    </div>

    <p style="margin: 22px 0 0 0; color: #334155; font-size: 14px;">
      Warm regards,<br />
      <strong>${displayCompany} Team</strong>
    </p>
  `;

  const text = [
    `Hi ${recipientName || 'there'},`,
    '',
    `${actorName || 'A team member'} updated a task you are involved with in ${displayCompany}: "${taskTitle}".`,
    '',
    `Update: ${updateSummary || 'Task details updated'}`,
    status ? `Status: ${status}` : '',
    `Priority: ${priorityLabel}`,
    projectName ? `Project: ${projectName}` : '',
    dueDate ? `Due Date: ${dueDate}` : '',
    category ? `Category: ${category}` : '',
    cleanDescription ? `\nDescription:\n${cleanDescription}` : '',
    '',
    `Open Task: ${taskUrl || ''}`,
    `Company Portal: ${effectiveLoginUrl}`,
    '',
    `Warm regards,`,
    `${displayCompany} Team`
  ].filter(Boolean).join('\n');

  const html = wrapFormalEmailTemplate({
    headerTitle: 'Task Update Notice',
    headerSubtitle: `Notification for ${recipientName || 'Team Member'} (${recipientEmail})`,
    bodyContent,
    recipientEmail,
    brandColor,
    brandName: displayCompany,
    preheader
  });

  return { subject, html, text };
}

module.exports = {
  buildTaskAssignedTemplate,
  buildTaskUpdatedTemplate,
  buildMarketingInvitationTemplate,
  buildRegistrationTemplate,
  buildAdminNewRegistrationNoticeTemplate,
  buildApprovalTemplate,
  buildPortalAccessTemplate
};
