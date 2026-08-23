/**
 * lib/notifications/templates/base-email-layout.ts
 *
 * Base responsive HTML email template layout with inline styles compatible with
 * all major email clients (Gmail, Apple Mail, Outlook, etc.).
 */

export interface BaseLayoutOptions {
  previewText?: string;
  storeName?: string;
  storeUrl?: string;
  contentHtml: string;
}

export function renderBaseEmailLayout(options: BaseLayoutOptions): string {
  const storeName = options.storeName || "Sivvai Store";
  const storeUrl = options.storeUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://sivvai.com";
  const previewText = options.previewText ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${options.previewText}</div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storeName}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  ${previewText}
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #090d16;">
    <tr>
      <td align="center" style="padding: 12px;">
        <table role="presentation" class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px; max-width: 600px; background-color: #111827; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background-color: #161e2e; border-bottom: 1px solid #1e293b; text-align: left;">
              <a href="${storeUrl}" style="text-decoration: none; display: inline-block;">
                <span style="font-size: 20px; font-weight: 700; color: #f8fafc; letter-spacing: -0.025em; text-transform: uppercase;">${storeName}</span>
              </a>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td class="content" style="padding: 32px; color: #cbd5e1; font-size: 15px; line-height: 1.6;">
              ${options.contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid #1e293b; text-align: center; color: #64748b; font-size: 13px; line-height: 1.5;">
              <p style="margin: 0 0 8px 0;">This email was sent by <a href="${storeUrl}" style="color: #94a3b8; text-decoration: underline;">${storeName}</a>.</p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
