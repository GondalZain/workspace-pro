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

module.exports = {
  buildMarketingInvitationTemplate,
  buildRegistrationTemplate,
  buildAdminNewRegistrationNoticeTemplate,
  buildApprovalTemplate,
  buildPortalAccessTemplate
};
