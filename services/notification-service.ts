import * as notificationRepo from "@/lib/db/notifications";
import * as orderRepo from "@/lib/db/orders";
import * as customerRepo from "@/lib/db/customers";
import { getDefaultEmailProvider } from "@/lib/notifications";
import {
  renderOrderConfirmationEmail,
  renderOrderStatusUpdateEmail,
  renderAdminInvitationEmail,
} from "@/lib/notifications/templates";
import { logger } from "@/lib/logger";

export interface SendOrderNotificationParams {
  customerId?: string | null;
  orderId?: string;
  channel?: string;
  recipient?: string;
  eventType?: "order.created" | "order.status_updated";
  status?: string;
  note?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  idempotencyKey?: string;
}

export interface SendAdminInvitationNotificationParams {
  email: string;
  roleName: string;
  token: string;
  invitationId?: string;
  message?: string | null;
  inviterEmail?: string;
  expiresInDays?: number;
}

export interface SendEmailNotificationParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  eventType?: string;
  customerId?: string | null;
  orderId?: string | null;
  idempotencyKey?: string;
}

/**
 * Dispatches an order-related transactional notification (email).
 * Guaranteed to be non-fatal: errors are caught, logged in database as 'failed',
 * and will never throw an exception that rolls back order transactions.
 */
export async function sendOrderNotification(params: SendOrderNotificationParams) {
  const channel = params.channel || "email";
  const eventType = params.eventType || "order.created";

  // If not email channel, create pending log for future SMS/WhatsApp support
  if (channel !== "email") {
    return notificationRepo.createNotificationLog({
      customer_id: params.customerId ?? null,
      order_id: params.orderId ?? null,
      channel,
      recipient: params.recipient || "unknown",
      status: "pending",
      sent_at: null,
    });
  }

  // Determine recipient email and order details
  let recipient = params.recipient;
  let orderData: orderRepo.OrderWithLines | null = null;
  let customerName: string | undefined;

  if (params.orderId) {
    try {
      orderData = await orderRepo.findOrderById(params.orderId);
      if (orderData) {
        if (!recipient || recipient === "customer") {
          const guestContact = orderData.guest_contact as { email?: string; first_name?: string; last_name?: string } | null;
          if (guestContact?.email) {
            recipient = guestContact.email;
            customerName = [guestContact.first_name, guestContact.last_name].filter(Boolean).join(" ");
          } else if (orderData.customer_id) {
            const customer = await customerRepo.findCustomerById(orderData.customer_id);
            if (customer?.email) {
              recipient = customer.email;
              customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
            }
          }
        }
      }
    } catch (err) {
      logger.warn(`[NotificationService] Could not resolve order details for orderId=${params.orderId}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (!recipient || recipient === "customer") {
    if (params.customerId) {
      try {
        const customer = await customerRepo.findCustomerById(params.customerId);
        if (customer?.email) {
          recipient = customer.email;
          customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
        }
      } catch (err) {
        logger.warn(`[NotificationService] Could not resolve customer email for customerId=${params.customerId}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  if (!recipient || recipient === "customer") {
    recipient = "unknown@recipient.local";
  }

  // Idempotency key: e.g. order-orderId-created or caller provided
  const idempotencyKey =
    params.idempotencyKey ||
    (params.orderId ? `order-${params.orderId}-${eventType}-${params.status || "default"}` : undefined);

  // Check idempotency: if already sent, return existing log immediately
  if (idempotencyKey) {
    const existing = await notificationRepo.findNotificationLogByIdempotencyKey(idempotencyKey);
    if (existing && existing.status === "sent") {
      logger.info(`[NotificationService] Skipping duplicate notification for idempotencyKey=${idempotencyKey}`);
      return existing;
    }
  }

  // Render template
  let rendered: { subject: string; html: string; text: string };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (eventType === "order.status_updated") {
    rendered = renderOrderStatusUpdateEmail({
      orderNumber: orderData?.order_number || params.orderId || "N/A",
      customerName,
      newStatus: params.status || orderData?.status || "Updated",
      note: params.note,
      trackingNumber: params.trackingNumber,
      carrier: params.carrier,
      viewOrderUrl: orderData ? `${siteUrl}/account/orders/${orderData.id}` : undefined,
    });
  } else {
    // Default: order.created
    if (orderData) {
      rendered = renderOrderConfirmationEmail({
        orderNumber: orderData.order_number,
        customerName,
        items: (orderData.lines || []).map((line) => ({
          name: line.product_name_snapshot,
          variantLabel: line.variant_label_snapshot,
          quantity: line.quantity,
          unitPrice: line.unit_price_snapshot,
          lineTotal: line.line_total,
        })),
        subtotal: orderData.subtotal,
        shippingTotal: orderData.shipping_total,
        discountTotal: orderData.discount_total,
        grandTotal: orderData.grand_total,
        currency: orderData.currency,
        shippingAddress: orderData.shipping_address as {
          street_line_1?: string;
          street_line_2?: string;
          city?: string;
          state?: string;
          country?: string;
        } | null,
        viewOrderUrl: `${siteUrl}/account/orders/${orderData.id}`,
      });
    } else {
      rendered = {
        subject: `Order Notification #${params.orderId || ""}`,
        html: `<p>Thank you for your order! Your order has been received.</p>`,
        text: `Thank you for your order! Your order has been received.`,
      };
    }
  }

  // Create initial pending log
  let logRecord: notificationRepo.NotificationLogRow;
  try {
    logRecord = await notificationRepo.createNotificationLog({
      customer_id: params.customerId ?? orderData?.customer_id ?? null,
      order_id: params.orderId ?? null,
      channel: "email",
      recipient,
      status: "pending",
      sent_at: null,
      idempotency_key: idempotencyKey ?? null,
      metadata: {
        eventType,
        subject: rendered.subject,
      },
    });
  } catch (err) {
    logger.error("[NotificationService] Failed to create initial pending log", {
      error: err instanceof Error ? err.message : String(err),
    });
    // If creation failed due to duplicate key race condition, attempt fetch
    if (idempotencyKey) {
      const existing = await notificationRepo.findNotificationLogByIdempotencyKey(idempotencyKey);
      if (existing) return existing;
    }
    throw err;
  }

  // Dispatch email physically via configured provider
  try {
    const provider = getDefaultEmailProvider();
    const result = await provider.send({
      to: recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (result.success) {
      logRecord = await notificationRepo.updateNotificationLog(logRecord.id, {
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: {
          eventType,
          subject: rendered.subject,
          provider: result.provider,
          messageId: result.messageId,
        },
      });
      logger.info(`[NotificationService] Notification sent successfully (logId=${logRecord.id}, msgId=${result.messageId})`);
    } else {
      logRecord = await notificationRepo.updateNotificationLog(logRecord.id, {
        status: "failed",
        error_message: result.error || "Email delivery failed",
        metadata: {
          eventType,
          subject: rendered.subject,
          provider: result.provider,
        },
      });
      logger.warn(`[NotificationService] Notification delivery failed (logId=${logRecord.id}): ${result.error}`);
    }
  } catch (deliveryError) {
    const errMsg = deliveryError instanceof Error ? deliveryError.message : "Unexpected delivery error";
    try {
      logRecord = await notificationRepo.updateNotificationLog(logRecord.id, {
        status: "failed",
        error_message: errMsg,
      });
    } catch {
      // Ignore database update errors during failure handling
    }
    logger.error(`[NotificationService] Exception during email delivery (logId=${logRecord.id})`, {
      error: errMsg,
    });
  }

  return logRecord;
}

/**
 * Dispatches an admin team invitation email.
 */
export async function sendAdminInvitationNotification(
  params: SendAdminInvitationNotificationParams
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const inviteUrl = `${siteUrl}/auth/callback?type=admin_invite&token=${params.token}`;

  const rendered = renderAdminInvitationEmail({
    recipientEmail: params.email,
    roleName: params.roleName,
    inviteUrl,
    message: params.message,
    inviterEmail: params.inviterEmail,
    expiresInDays: params.expiresInDays || 7,
  });

  const idempotencyKey = params.invitationId
    ? `admin-invite-${params.invitationId}`
    : `admin-invite-${params.token}`;

  // Check idempotency
  const existing = await notificationRepo.findNotificationLogByIdempotencyKey(idempotencyKey);
  if (existing && existing.status === "sent") {
    logger.info(`[NotificationService] Skipping duplicate admin invitation for idempotencyKey=${idempotencyKey}`);
    return existing;
  }

  let logRecord = await notificationRepo.createNotificationLog({
    customer_id: null,
    order_id: null,
    channel: "email",
    recipient: params.email,
    status: "pending",
    sent_at: null,
    idempotency_key: idempotencyKey,
    metadata: {
      eventType: "admin.invitation",
      subject: rendered.subject,
      roleName: params.roleName,
    },
  });

  try {
    const provider = getDefaultEmailProvider();
    const result = await provider.send({
      to: params.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (result.success) {
      logRecord = await notificationRepo.updateNotificationLog(logRecord.id, {
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: {
          eventType: "admin.invitation",
          subject: rendered.subject,
          provider: result.provider,
          messageId: result.messageId,
        },
      });
      logger.info(`[NotificationService] Admin invitation email sent (logId=${logRecord.id}, msgId=${result.messageId})`);
    } else {
      logRecord = await notificationRepo.updateNotificationLog(logRecord.id, {
        status: "failed",
        error_message: result.error || "Email delivery failed",
        metadata: {
          eventType: "admin.invitation",
          subject: rendered.subject,
          provider: result.provider,
        },
      });
      logger.warn(`[NotificationService] Admin invitation email failed (logId=${logRecord.id}): ${result.error}`);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unexpected email error";
    try {
      logRecord = await notificationRepo.updateNotificationLog(logRecord.id, {
        status: "failed",
        error_message: errMsg,
      });
    } catch {
      // Ignore
    }
    logger.error(`[NotificationService] Exception during admin invitation send (logId=${logRecord.id})`, {
      error: errMsg,
    });
  }

  return logRecord;
}

/**
 * General helper to send an arbitrary transactional email with audit logging.
 */
export async function sendEmailNotification(params: SendEmailNotificationParams) {
  const idempotencyKey = params.idempotencyKey;

  if (idempotencyKey) {
    const existing = await notificationRepo.findNotificationLogByIdempotencyKey(idempotencyKey);
    if (existing && existing.status === "sent") {
      return existing;
    }
  }

  let logRecord = await notificationRepo.createNotificationLog({
    customer_id: params.customerId ?? null,
    order_id: params.orderId ?? null,
    channel: "email",
    recipient: params.to,
    status: "pending",
    sent_at: null,
    idempotency_key: idempotencyKey ?? null,
    metadata: {
      eventType: params.eventType || "custom.email",
      subject: params.subject,
    },
  });

  try {
    const provider = getDefaultEmailProvider();
    const result = await provider.send({
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (result.success) {
      logRecord = await notificationRepo.updateNotificationLog(logRecord.id, {
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: {
          eventType: params.eventType || "custom.email",
          subject: params.subject,
          provider: result.provider,
          messageId: result.messageId,
        },
      });
    } else {
      logRecord = await notificationRepo.updateNotificationLog(logRecord.id, {
        status: "failed",
        error_message: result.error || "Delivery failed",
        metadata: {
          eventType: params.eventType || "custom.email",
          subject: params.subject,
          provider: result.provider,
        },
      });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unexpected email delivery error";
    try {
      logRecord = await notificationRepo.updateNotificationLog(logRecord.id, {
        status: "failed",
        error_message: errMsg,
      });
    } catch {
      // Ignore
    }
  }

  return logRecord;
}
