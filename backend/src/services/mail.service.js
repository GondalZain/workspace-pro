// @ts-nocheck
const { smtp } = require('../config/env');
const { getTransporter } = require('./mail/mail.transporter');
const { htmlToPlainText } = require('./mail/mail.layout');
const {
  buildRegistrationTemplate,
  buildAdminNewRegistrationNoticeTemplate,
  buildApprovalTemplate,
  buildPortalAccessTemplate
} = require('./mail/mail.templates');

/**
 * Sends email via Resend Official REST API (`https://api.resend.com/emails`).
 */
async function sendViaResendApi({ to, subject, text, html, replyTo }) {
  const apiKey = smtp.resendApiKey || smtp.pass;
  const fromEmail = smtp.fromEmail && smtp.fromEmail.includes('@')
    ? smtp.fromEmail.trim()
    : 'onboarding@resend.dev';
  const fromName = (smtp.fromName || 'Workspace Pro').replace(/["<>]/g, '').trim();
  const from = `"${fromName}" <${fromEmail}>`;
  const replyToAddress = replyTo || smtp.inboundEmail || 'reply@entuepu.resend.app';

  const payload = {
    from,
    to: [to],
    subject,
    text,
    html,
    reply_to: replyToAddress,
    headers: {
      'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      'Precedence': 'list',
      'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`
    }
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || (data.errors ? JSON.stringify(data.errors) : `Resend API HTTP ${response.status}`);
    const err = new Error(errorMsg);
    err.statusCode = response.status;
    throw err;
  }
  const messageId = data.id || 'resend-api';
  console.log(`[MailService] Dispatched via Resend API (${from}) to ${to}. MessageId: ${messageId}`);
  return { success: true, messageId, deliveredVia: 'resend-api' };
}

/**
 * Sends email via Resend SMTP (`smtp.resend.com:465`).
 */
async function sendViaResendSmtp({ to, subject, text, html, from, replyTo }) {
  const fromEmail = smtp.fromEmail && smtp.fromEmail.includes('@')
    ? smtp.fromEmail.trim()
    : 'onboarding@resend.dev';
  const senderName = (smtp.fromName || 'Workspace Pro').replace(/["<>]/g, '').trim();
  const sender = from || `"${senderName}" <${fromEmail}>`;
  const replyToAddress = replyTo || smtp.inboundEmail || 'reply@entuepu.resend.app';

  const mailClient = getTransporter();
  const info = await mailClient.sendMail({
    from: sender,
    replyTo: replyToAddress,
    to,
    subject,
    text,
    html
  });
  console.log(`[MailService] Dispatched via Resend SMTP (${smtp.host}:${smtp.port}) to ${to}. MessageId: ${info.messageId}`);
  return { success: true, messageId: info.messageId, deliveredVia: 'resend-smtp' };
}

/**
 * Resend Delivery Engine:
 * Sends transactional notifications using Resend API / SMTP.
 */
async function sendMail({ to, subject, text, html, from, replyTo }) {
  if (!to) {
    console.warn('[MailService] Cannot send email: recipient address (to) is missing.');
    return { success: false, error: 'Recipient is required' };
  }

  const targetEmail = to.trim();
  const plainText = text || htmlToPlainText(html);

  async function dispatchViaResend(recipient, mailSubject, mailText, mailHtml) {
    const apiKey = smtp.resendApiKey || smtp.pass;
    if (apiKey) {
      try {
        return await sendViaResendApi({ to: recipient, subject: mailSubject, text: mailText, html: mailHtml, replyTo });
      } catch (apiErr) {
        if (/testing emails to your own email address|verify a domain/i.test(apiErr.message)) {
          throw apiErr;
        }
        console.warn(`[MailService] Resend API attempt failed for ${recipient}, trying Resend SMTP:`, apiErr.message);
      }
    }

    if (smtp.host && smtp.user && smtp.pass) {
      return await sendViaResendSmtp({ to: recipient, subject: mailSubject, text: mailText, html: mailHtml, from, replyTo });
    }

    console.log(`[MailService SIMULATION] To: ${recipient} | Subject: "${mailSubject}"`);
    return { success: true, simulated: true };
  }

  try {
    return await dispatchViaResend(targetEmail, subject, plainText, html);
  } catch (resendError) {
    // When using unverified domain (onboarding@resend.dev), Resend restricts sending to the account owner (gondalzain717@gmail.com).
    // Safely route to the verified account owner so test dispatch never breaks registration flow.
    if (/testing emails to your own email address|verify a domain/i.test(resendError.message)) {
      const ownerEmail = (smtp.adminNotificationEmail || 'gondalzain717@gmail.com').trim();
      const demoSubject = `[Resend Sandbox for: ${targetEmail}] ${subject}`;
      console.warn(`[MailService] Resend sandbox restriction: Resend API rejected recipient "${targetEmail}". Resend only allows sending to the account owner (${ownerEmail}) until a custom domain is verified at resend.com/domains.`);
      try {
        const fallbackRes = await dispatchViaResend(ownerEmail, demoSubject, plainText, html);
        return {
          ...fallbackRes,
          reroutedTo: ownerEmail,
          originalRecipient: targetEmail,
          restrictionReason: resendError.message
        };
      } catch (ownerErr) {
        console.error(`[MailService] Resend delivery to owner failed:`, ownerErr.message);
        return { success: false, error: ownerErr.message };
      }
    }
    console.error(`[MailService] Resend delivery failed:`, resendError.message);
    return { success: false, error: resendError.message };
  }
}

/**
 * 1. First Priority: Send Workspace Registration Confirmation Email to the Registered User
 */
async function sendWorkspaceRegistrationEmail(params) {
  console.log(`\n================== [EMAIL: USER CONFIRMATION] ==================`);
  console.log(`[MailService] Attempting to send Registration Confirmation to user: ${params.recipientEmail}`);
  console.log(`[MailService] Applicant Name: ${params.recipientName} | Company: ${params.companyName}`);
  
  const { subject, html, text } = buildRegistrationTemplate(params);
  const result = await sendMail({
    to: params.recipientEmail,
    subject,
    text,
    html
  });

  if (result.success) {
    if (result.reroutedTo) {
      console.log(`[MailService] [USER EMAIL NOT DELIVERED DIRECTLY TO USER INBOX]`);
      console.log(`[MailService] Reason: Resend unverified domain (onboarding@resend.dev) blocked delivery to ${params.recipientEmail}.`);
      console.log(`[MailService] Instead, Resend delivered it to account owner: ${result.reroutedTo} (MessageId: ${result.messageId})`);
    } else {
      console.log(`[MailService] [SUCCESS] Delivered directly to user inbox: ${params.recipientEmail} (MessageId: ${result.messageId})`);
    }
  } else {
    console.error(`[MailService] [FAILED] Could not send to user ${params.recipientEmail}: ${result.error}`);
  }
  console.log(`=================================================================\n`);
  return result;
}

/**
 * 1b. Send notification to Super Admin when a new workspace registration is submitted
 */
async function sendAdminNewRegistrationNotification(params) {
  const candidateAdmin = params.adminEmail || smtp.adminNotificationEmail;
  const adminTargetEmail = candidateAdmin && candidateAdmin.includes('@')
    ? candidateAdmin.trim()
    : 'gondalzain717@gmail.com';

  console.log(`\n================== [EMAIL: SUPER ADMIN ALERT] ==================`);
  console.log(`[MailService] Sending New Registration Alert to Super Admin: ${adminTargetEmail}`);
  console.log(`[MailService] For Applicant: ${params.applicantEmail} (${params.companyName})`);

  const { subject, html, text } = buildAdminNewRegistrationNoticeTemplate({
    ...params,
    adminEmail: adminTargetEmail
  });

  const result = await sendMail({
    to: adminTargetEmail,
    subject,
    text,
    html
  });

  if (result.success) {
    console.log(`[MailService] [SUCCESS] Super Admin Alert delivered to ${adminTargetEmail} (MessageId: ${result.messageId})`);
  } else {
    console.error(`[MailService] [FAILED] Super Admin Alert failed to ${adminTargetEmail}: ${result.error}`);
  }
  console.log(`=================================================================\n`);
  return result;
}

/**
 * 2. Send workspace approval email to the user with secure Create Password link
 */
async function sendWorkspaceApprovedEmail(params) {
  const { subject, html, text } = buildApprovalTemplate(params);
  return sendMail({
    to: params.recipientEmail,
    subject,
    text,
    html
  });
}

/**
 * 3. Send custom company portal access confirmation email to the user once password is set
 */
async function sendWorkspacePortalAccessEmail(params) {
  const { subject, html, text } = buildPortalAccessTemplate(params);
  return sendMail({
    to: params.recipientEmail,
    subject,
    text,
    html
  });
}


/**
 * Send Marketing / Workspace Invitation Email with Reply-To-Register prompt
 */
async function sendMarketingInvitationEmail(params) {
  const { buildMarketingInvitationTemplate } = require('./mail/mail.templates');
  const { subject, html, text } = buildMarketingInvitationTemplate(params);

  console.log(`\n================== [EMAIL: MARKETING INVITATION] ==================`);
  console.log(`[MailService] Sending Marketing Invitation to: ${params.recipientEmail}`);
  console.log(`[MailService] Suggested Company: ${params.suggestedCompany || 'Auto'} | Name: ${params.recipientName}`);

  const result = await sendMail({
    to: params.recipientEmail,
    subject,
    text,
    html
  });

  console.log(`[MailService] Marketing Invitation Result: ${result.success ? 'DISPATCHED' : 'FAILED'}`);
  console.log(`===================================================================\n`);
  return result;
}

module.exports = {
  sendMarketingInvitationEmail,
  sendMail,
  sendWorkspaceRegistrationEmail,
  sendAdminNewRegistrationNotification,
  sendWorkspaceApprovedEmail,
  sendWorkspacePortalAccessEmail
};
