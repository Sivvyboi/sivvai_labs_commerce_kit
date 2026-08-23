import { renderBaseEmailLayout } from "./base-email-layout";

export interface AdminInvitationTemplateData {
  recipientEmail: string;
  roleName: string;
  inviteUrl: string;
  inviterEmail?: string;
  message?: string | null;
  expiresInDays?: number;
}

export function renderAdminInvitationEmail(data: AdminInvitationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Invitation to join the Admin Team (${data.roleName})`;
  const inviterText = data.inviterEmail
    ? `<strong>${data.inviterEmail}</strong> has invited you`
    : `You have been invited`;

  const messageHtml = data.message
    ? `<div style="margin: 20px 0; padding: 14px; background-color: #161e2e; border-left: 3px solid #3b82f6; border-radius: 4px; font-size: 14px; color: #cbd5e1; font-style: italic;">
        "${data.message}"
      </div>`
    : "";

  const expiryText = data.expiresInDays
    ? `This invitation will expire in ${data.expiresInDays} days.`
    : "This invitation link is valid for 7 days.";

  const contentHtml = `
    <div style="margin-bottom: 24px;">
      <h1 style="font-size: 20px; font-weight: 700; color: #f8fafc; margin: 0 0 12px 0;">Admin Console Invitation</h1>
      <p style="margin: 0 0 12px 0; color: #cbd5e1; font-size: 15px; line-height: 1.5;">
        ${inviterText} to join the administrative team as <strong style="color: #60a5fa;">${data.roleName}</strong>.
      </p>

      ${messageHtml}

      <div style="margin: 28px 0; text-align: center;">
        <a href="${data.inviteUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.025em; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
          Accept Invitation & Set Up Account
        </a>
      </div>

      <p style="margin: 20px 0 8px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
        ${expiryText} If you did not expect this invitation, you can safely ignore this email.
      </p>
      <div style="font-size: 12px; color: #64748b; word-break: break-all; margin-top: 16px;">
        Button not working? Paste this link into your browser:<br/>
        <a href="${data.inviteUrl}" style="color: #60a5fa; text-decoration: underline;">${data.inviteUrl}</a>
      </div>
    </div>
  `;

  const html = renderBaseEmailLayout({
    previewText: `You have been invited to join the Admin Team as ${data.roleName}`,
    contentHtml,
  });

  const textLines = [
    `Admin Console Invitation`,
    ``,
    `${data.inviterEmail ? `${data.inviterEmail} has invited you` : "You have been invited"} to join the admin team as ${data.roleName}.`,
    data.message ? `\nPersonal Note: "${data.message}"\n` : "",
    ``,
    `Accept your invitation here:`,
    `${data.inviteUrl}`,
    ``,
    `${expiryText}`,
  ].filter(Boolean);

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}
