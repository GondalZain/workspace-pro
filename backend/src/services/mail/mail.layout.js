// @ts-nocheck
/**
 * High-Deliverability Enterprise Email Layout Wrapper
 * Engineered for Primary Inbox Placement (Gmail, Outlook, Apple Mail)
 * - Clean, professional card container with brand color top bar.
 * - Hidden inbox preview preheader snippet so email lists display meaningful summaries.
 * - Bulletproof typography and tables with high text-to-HTML ratio to bypass spam filters.
 */
function wrapFormalEmailTemplate({
  headerTitle,
  headerSubtitle,
  bodyContent,
  recipientEmail,
  brandColor,
  brandName,
  preheader
}) {
  const year = new Date().getFullYear();
  const safeRecipient = recipientEmail || 'your work email';
  const effectiveBrandColor = brandColor && /^#[0-9a-f]{3,8}$/i.test(brandColor.trim())
    ? brandColor.trim()
    : '#0f766e';
  const effectiveBrandName = brandName || 'Workspace Pro';
  const previewSnippet = preheader || headerSubtitle || `${headerTitle} - ${effectiveBrandName}`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${headerTitle || effectiveBrandName}</title>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.6;">

  <!-- Hidden Preview Preheader Text for Gmail / Outlook Inbox list view -->
  <div style="display:none; font-size:1px; color:#f1f5f9; line-height:1px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; mso-hide:all;">
    ${previewSnippet} &#847; &zwnj; &nbsp; &#8199; &#65279;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 36px 12px 48px 12px;">
        
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: 4px solid ${effectiveBrandColor}; border-radius: 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); overflow: hidden;">
          <tr>
            <td style="padding: 32px 36px;">

              <!-- Brand Header Bar -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 22px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="width: 32px; height: 32px; background-color: ${effectiveBrandColor}; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 800; line-height: 32px;">
                          ${effectiveBrandName.slice(0, 1).toUpperCase()}
                        </td>
                        <td style="padding-left: 12px; vertical-align: middle;">
                          <div style="font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px;">
                            ${effectiveBrandName}
                          </div>
                          <div style="font-size: 11px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                            Workspace Portal
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; font-size: 11px; font-weight: 600; color: ${effectiveBrandColor}; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 9999px;">
                      Verified Notification
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Email Subject / Heading -->
              <div style="font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.35; margin-bottom: 8px;">
                ${headerTitle || 'Workspace Notification'}
              </div>
              ${headerSubtitle ? `<div style="font-size: 13px; color: #64748b; margin-bottom: 22px; line-height: 1.5;">${headerSubtitle}</div>` : '<div style="margin-bottom: 18px;"></div>'}

              <!-- Main Body Content -->
              <div style="color: #334155; font-size: 15px; line-height: 1.65;">
                ${bodyContent}
              </div>

              <!-- Footer Section -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                <tr>
                  <td style="font-size: 12px; line-height: 1.6; color: #94a3b8; text-align: left;">
                    <p style="margin: 0 0 6px 0;">
                      🔒 Delivered securely to <strong style="color: #475569;">${safeRecipient}</strong>.
                    </p>
                    <p style="margin: 0 0 6px 0;">
                      Workspace: <strong style="color: #475569;">${effectiveBrandName}</strong> &bull; Powered by Workspace Pro Platform
                    </p>
                    <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                      &copy; ${year} ${effectiveBrandName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>

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
