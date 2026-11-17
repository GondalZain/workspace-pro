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
  recipientEmail
}) {
  const year = new Date().getFullYear();
  const safeRecipient = recipientEmail || 'your work email';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headerTitle || 'Workspace Pro'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; font-size: 15px; line-height: 1.6;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
          <tr>
            <td style="padding: 28px 32px; text-align: left;">
              <div style="font-size: 13px; font-weight: 600; color: #0f766e; margin-bottom: 4px;">
                Workspace Pro
              </div>
              <div style="font-size: 19px; font-weight: 700; color: #111827; line-height: 1.35; margin-bottom: 6px;">
                ${headerTitle || 'Workspace Update'}
              </div>
              ${headerSubtitle ? `<div style="font-size: 13px; color: #6b7280; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f3f4f6;">${headerSubtitle}</div>` : '<div style="margin-bottom: 18px; border-bottom: 1px solid #f3f4f6;"></div>'}
              <div style="color: #374151; font-size: 15px; line-height: 1.65;">
                ${bodyContent}
              </div>
              <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #f3f4f6; font-size: 12px; line-height: 1.5; color: #6b7280;">
                <p style="margin: 0 0 4px 0;">
                  Sent to <span style="color: #374151; font-weight: 500;">${safeRecipient}</span> from Workspace Pro.
                </p>
                <p style="margin: 0; color: #9ca3af;">
                  &copy; ${year} Workspace Pro.
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
