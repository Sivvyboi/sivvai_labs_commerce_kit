import { renderBaseEmailLayout } from "./base-email-layout";

export interface OrderConfirmationTemplateData {
  orderNumber: string;
  customerName?: string;
  items: Array<{
    name: string;
    variantLabel?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  shippingTotal: number;
  discountTotal?: number;
  grandTotal: number;
  currency: string;
  shippingAddress?: {
    street_line_1?: string;
    street_line_2?: string | null;
    city?: string;
    state?: string;
    country?: string;
  } | null;
  viewOrderUrl?: string;
}

function formatMoney(amount: number, currency: string = "NGN"): string {
  const major = amount / 100;
  if (currency.toUpperCase() === "NGN") {
    return `₦${major.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function renderOrderConfirmationEmail(data: OrderConfirmationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Order Confirmation #${data.orderNumber}`;
  const greeting = data.customerName ? `Hi ${data.customerName},` : "Thank you for your order!";

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 12px 0; text-align: left;">
          <div style="font-weight: 600; color: #f8fafc; font-size: 14px;">${item.name}</div>
          ${item.variantLabel ? `<div style="font-size: 12px; color: #94a3b8;">${item.variantLabel}</div>` : ""}
          <div style="font-size: 12px; color: #64748b;">Qty: ${item.quantity} &times; ${formatMoney(item.unitPrice, data.currency)}</div>
        </td>
        <td style="padding: 12px 0; text-align: right; vertical-align: top; font-weight: 600; color: #f8fafc; font-size: 14px;">
          ${formatMoney(item.lineTotal, data.currency)}
        </td>
      </tr>`
    )
    .join("");

  const addressHtml = data.shippingAddress?.street_line_1
    ? `<div style="margin-top: 24px; padding: 16px; background-color: #1e293b; border-radius: 8px; font-size: 13px; line-height: 1.5; color: #94a3b8;">
        <div style="font-weight: 600; color: #f8fafc; margin-bottom: 6px;">Shipping Address</div>
        <div>${data.shippingAddress.street_line_1}</div>
        ${data.shippingAddress.street_line_2 ? `<div>${data.shippingAddress.street_line_2}</div>` : ""}
        <div>${data.shippingAddress.city || ""}, ${data.shippingAddress.state || ""} ${data.shippingAddress.country || ""}</div>
      </div>`
    : "";

  const ctaButton = data.viewOrderUrl
    ? `<div style="margin-top: 32px; text-align: center;">
        <a href="${data.viewOrderUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Order Status
        </a>
      </div>`
    : "";

  const contentHtml = `
    <div style="margin-bottom: 24px;">
      <h1 style="font-size: 20px; font-weight: 700; color: #f8fafc; margin: 0 0 8px 0;">${greeting}</h1>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">
        We have received your order <strong style="color: #f8fafc;">#${data.orderNumber}</strong> and it is now being processed.
      </p>
    </div>

    <!-- Order Summary Table -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 16px; border-top: 1px solid #1e293b;">
      ${itemsHtml}
    </table>

    <!-- Totals -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 16px; font-size: 14px;">
      <tr>
        <td style="padding: 6px 0; color: #94a3b8;">Subtotal</td>
        <td style="padding: 6px 0; text-align: right; color: #f8fafc;">${formatMoney(data.subtotal, data.currency)}</td>
      </tr>
      ${
        data.discountTotal && data.discountTotal > 0
          ? `<tr>
        <td style="padding: 6px 0; color: #10b981;">Discount</td>
        <td style="padding: 6px 0; text-align: right; color: #10b981;">-${formatMoney(data.discountTotal, data.currency)}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding: 6px 0; color: #94a3b8;">Shipping</td>
        <td style="padding: 6px 0; text-align: right; color: #f8fafc;">${formatMoney(data.shippingTotal, data.currency)}</td>
      </tr>
      <tr style="border-top: 1px solid #334155;">
        <td style="padding: 12px 0; font-weight: 700; font-size: 16px; color: #f8fafc;">Total</td>
        <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 16px; color: #f8fafc;">${formatMoney(data.grandTotal, data.currency)}</td>
      </tr>
    </table>

    ${addressHtml}
    ${ctaButton}
  `;

  const html = renderBaseEmailLayout({
    previewText: `Order #${data.orderNumber} confirmed. Total: ${formatMoney(data.grandTotal, data.currency)}`,
    contentHtml,
  });

  const textLines = [
    `${greeting}`,
    ``,
    `Thank you for your order #${data.orderNumber}!`,
    `Total: ${formatMoney(data.grandTotal, data.currency)}`,
    ``,
    `Items:`,
    ...data.items.map(
      (item) =>
        `- ${item.name} (${item.variantLabel || "Standard"}) x${item.quantity} = ${formatMoney(item.lineTotal, data.currency)}`
    ),
    ``,
    `Subtotal: ${formatMoney(data.subtotal, data.currency)}`,
    data.discountTotal ? `Discount: -${formatMoney(data.discountTotal, data.currency)}` : "",
    `Shipping: ${formatMoney(data.shippingTotal, data.currency)}`,
    `Grand Total: ${formatMoney(data.grandTotal, data.currency)}`,
    data.viewOrderUrl ? `\nView your order here: ${data.viewOrderUrl}` : "",
  ].filter(Boolean);

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}
