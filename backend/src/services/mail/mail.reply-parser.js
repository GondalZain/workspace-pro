// @ts-nocheck
/**
 * Smart Email Reply Parser:
 * Extracts applicant email, company name, contact person name, and tier
 * from incoming emails/webhooks even if the user formats their reply loosely.
 */
function parseInboundEmailContent({ from, subject, text, html }) {
  // 1. Extract raw sender email address and name
  let senderEmail = '';
  let senderName = '';

  if (typeof from === 'string') {
    const emailMatch = from.match(/<([^>]+)>/);
    if (emailMatch) {
      senderEmail = emailMatch[1].trim().toLowerCase();
      senderName = from.replace(/<[^>]+>/, '').replace(/["']/g, '').trim();
    } else {
      senderEmail = from.trim().toLowerCase();
    }
  } else if (from && typeof from === 'object') {
    senderEmail = (from.email || '').trim().toLowerCase();
    senderName = (from.name || '').trim();
  }

  // 2. Clean plain text body (strip email quote reply headers if present)
  let content = (text || '').replace(/\r\n/g, '\n');
  if (!content && html) {
    content = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  }

  // Cut off previous thread quote lines (e.g., "On Nov 3, 2026 ... wrote:", "From: ...")
  const quoteBoundaryRegex = /(?:^|\n)(?:On\s+.+?wrote:|From:\s*.+?|<.+?@.+?>|-----Original Message-----|________________________________)/i;
  const replyOnly = content.split(quoteBoundaryRegex)[0] || content;

  // 3. Extract Company Name
  let companyName = '';
  const companyPatterns = [
    /(?:company(?:\s*name)?|workspace(?:\s*name)?|business(?:\s*name)?|organization|org)\s*[:=-]\s*([^\n\r,.;]+)/i,
    /(?:company|workspace|business)\s+is\s+([^\n\r,.;]+)/i,
    /(?:my\s+company\s+(?:is|name\s+is)|register\s+(?:my\s+)?company|for\s+company)\s*["']?([A-Za-z0-9\s&._-]{2,40})["']?/i,
    /(?:company|org)\s+([A-Za-z0-9\s&._-]{2,40})/i
  ];

  for (const regex of companyPatterns) {
    const match = replyOnly.match(regex);
    if (match && match[1] && match[1].trim()) {
      companyName = match[1].trim();
      break;
    }
  }

  // If no explicit company label found, check subject line (e.g. "Re: Registration received: Acme Workspace")
  if (!companyName && subject) {
    const subjectMatch = subject.match(/(?:for|received:?|workspace)\s+([A-Za-z0-9\s&._-]{2,30})\s*(?:workspace)?/i);
    if (subjectMatch && subjectMatch[1]) {
      const candidate = subjectMatch[1].replace(/^(re|fwd):\s*/i, '').trim();
      if (!/^(the|our|new|free|trial|registration)$/i.test(candidate)) {
        companyName = candidate;
      }
    }
  }

  // Fallback company name if user replied without specifying
  if (!companyName) {
    if (senderEmail.includes('@')) {
      const domainPart = senderEmail.split('@')[1].split('.')[0];
      const commonPublic = ['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'aol'];
      if (!commonPublic.includes(domainPart.toLowerCase())) {
        companyName = domainPart.charAt(0).toUpperCase() + domainPart.slice(1) + ' Workspace';
      }
    }
    if (!companyName) {
      companyName = (senderName ? `${senderName}'s Workspace` : 'New Workspace');
    }
  }

  // 4. Extract Full Name
  let fullName = '';
  const namePatterns = [
    /(?:my\s*name(?:\s*is)?|full\s*name|contact\s*name|name)\s*[:=-]\s*([^\n\r,.;]+)/i,
    /(?:i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];

  for (const regex of namePatterns) {
    const match = replyOnly.match(regex);
    if (match && match[1] && match[1].trim()) {
      fullName = match[1].trim();
      break;
    }
  }

  if (!fullName) {
    fullName = senderName || (senderEmail.split('@')[0] || 'Administrator');
  }

  // 5. Extract Plan
  let planId = 'trial';
  if (/pro|professional|paid|standard/i.test(replyOnly)) {
    planId = 'pro';
  } else if (/ultra|enterprise/i.test(replyOnly)) {
    planId = 'ultra';
  }

  return {
    senderEmail,
    senderName,
    fullName,
    companyName,
    planId,
    rawReply: replyOnly.trim()
  };
}

module.exports = {
  parseInboundEmailContent
};

