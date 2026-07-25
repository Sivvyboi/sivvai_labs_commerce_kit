import * as notificationRepo from "@/lib/db/notifications";

export async function sendOrderNotification(params: {
  customerId: string;
  orderId?: string;
  channel: string;
  recipient: string;
}) {
  return notificationRepo.createNotificationLog({
    customer_id: params.customerId,
    order_id: params.orderId ?? null,
    channel: params.channel,
    recipient: params.recipient,
    status: "pending",
    sent_at: null,
  });
}
