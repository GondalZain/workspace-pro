// @ts-nocheck
/**
 * High-Deliverability Personal Executive Mail Layout Wrapper
 * Engineered for Primary Inbox Placement (Gmail, Outlook, Apple Mail)
 * - Avoids nested multi-background marketing tables, `bgcolor` attributes, and ALL-CAPS headers
 *   that trigger Gmail Spam filters on shared transactional domains (`demomailtrap.co`).
 * - Uses a clean, 1-to-1 personal onboarding letter structure with a high text-to-HTML ratio.
 */
function wrapFormalEmailTemplate({
  headerTitle,
  headerSubtitle,
  bodyContent,
  recipientEmail,
  brandColor,
  brandName
}) {
  const year = new Date().getFullYear();
  const safeRecipient = recipientEmail || 'your work email';
  const effectiveBrandColor = brandColor && /^#[0-9a-f]{3,8}$/i.test(brandColor.trim())
    ? brandColor.trim()
    : '#0f766e';
  const effectiveBrandName = brandName || 'Workspace Pro';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headerTitle || effectiveBrandName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.6;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 30px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 32px 32px; text-align: left;">
              <div style="font-size: 13px; font-weight: 700; color: ${effectiveBrandColor}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                ${effectiveBrandName}
              </div>
              <div style="font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.35; margin-bottom: 6px;">
                ${headerTitle || 'Workspace Update'}
              </div>
              ${headerSubtitle ? `<div style="font-size: 13px; color: #64748b; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">${headerSubtitle}</div>` : '<div style="margin-bottom: 20px; border-bottom: 1px solid #f1f5f9;"></div>'}
              <div style="color: #334155; font-size: 15px; line-height: 1.65;">
                ${bodyContent}
              </div>
              <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                <p style="margin: 0 0 4px 0;">
                  Sent to <span style="color: #475569; font-weight: 500;">${safeRecipient}</span> from ${effectiveBrandName}.
                </p>
                <p style="margin: 0; color: #cbd5e1;">
                  &copy; ${year} ${effectiveBrandName}. All rights reserved.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Converts HTML into clean, natural plain text (RFC 5322 compliant)
 * so MIME multipart/alternative checks pass Gmail's filters cleanly.
 */
function htmlToPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<\/(p|div|h1|h2|h3|tr|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  - ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&bull;/g, '-')
    .replace(/&copy;/g, '(c)')
    .replace(/&rarr;/g, '->')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  wrapFormalEmailTemplate,
  htmlToPlainText
};
