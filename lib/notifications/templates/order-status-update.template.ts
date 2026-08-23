import { renderBaseEmailLayout } from "./base-email-layout";

export interface OrderStatusUpdateTemplateData {
  orderNumber: string;
  customerName?: string;
  newStatus: string;
  note?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  viewOrderUrl?: string;
}

function getStatusBadge(status: string): { label: string; bg: string; color: string } {
  switch (status.toLowerCase()) {
    case "completed":
    case "delivered":
      return { label: "Completed", bg: "#065f46", color: "#6ee7b7" };
    case "shipped":
    case "processing":
      return { label: status.toUpperCase(), bg: "#1e40af", color: "#93c5fd" };
    case "cancelled":
      return { label: "Cancelled", bg: "#7f1d1d", color: "#fca5a5" };
    case "refunded":
      return { label: "Refunded", bg: "#581c87", color: "#d8b4fe" };
    default:
      return { label: status.toUpperCase(), bg: "#334155", color: "#e2e8f0" };
  }
}

export function renderOrderStatusUpdateEmail(data: OrderStatusUpdateTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Update on Order #${data.orderNumber} - ${data.newStatus.toUpperCase()}`;
  const greeting = data.customerName ? `Hi ${data.customerName},` : "Hello,";
  const badge = getStatusBadge(data.newStatus);

  const trackingHtml = data.trackingNumber
    ? `<div style="margin-top: 20px; padding: 16px; background-color: #1e293b; border-radius: 8px; font-size: 14px;">
        <div style="font-weight: 600; color: #f8fafc; margin-bottom: 4px;">Tracking Information</div>
        <div style="color: #cbd5e1;">Carrier: <strong>${data.carrier || "Standard Courier"}</strong></div>
        <div style="color: #cbd5e1;">Tracking Number: <strong style="font-family: monospace; color: #38bdf8;">${data.trackingNumber}</strong></div>
      </div>`
    : "";

  const noteHtml = data.note
    ? `<div style="margin-top: 16px; padding: 14px; background-color: #161e2e; border-left: 3px solid #3b82f6; border-radius: 4px; font-size: 14px; color: #cbd5e1;">
        ${data.note}
      </div>`
    : "";

  const ctaButton = data.viewOrderUrl
    ? `<div style="margin-top: 32px; text-align: center;">
        <a href="${data.viewOrderUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Full Order Details
        </a>
      </div>`
    : "";

  const contentHtml = `
    <div style="margin-bottom: 24px;">
      <h1 style="font-size: 20px; font-weight: 700; color: #f8fafc; margin: 0 0 8px 0;">${greeting}</h1>
      <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 14px;">
        The status of your order <strong style="color: #f8fafc;">#${data.orderNumber}</strong> has been updated:
      </p>

      <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background-color: ${badge.bg}; color: ${badge.color}; font-weight: 600; font-size: 13px; letter-spacing: 0.05em;">
        ${badge.label}
      </div>

      ${noteHtml}
      ${trackingHtml}
      ${ctaButton}
    </div>
  `;

  const html = renderBaseEmailLayout({
    previewText: `Order #${data.orderNumber} status update: ${badge.label}`,
    contentHtml,
  });

  const textLines = [
    `${greeting}`,
    ``,
    `Your order #${data.orderNumber} status has been updated to: ${data.newStatus.toUpperCase()}`,
    data.note ? `Note: ${data.note}` : "",
    data.trackingNumber ? `Tracking: ${data.trackingNumber} (${data.carrier || "Courier"})` : "",
    data.viewOrderUrl ? `\nView order details: ${data.viewOrderUrl}` : "",
  ].filter(Boolean);

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}
