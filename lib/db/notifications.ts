import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type NotificationLogRow = Database["public"]["Tables"]["notification_logs"]["Row"];
export type NotificationLogInsert = Database["public"]["Tables"]["notification_logs"]["Insert"];
export type NotificationLogUpdate = Database["public"]["Tables"]["notification_logs"]["Update"];
export type NotificationTemplateRow = Database["public"]["Tables"]["notification_templates"]["Row"];

export async function createNotificationLog(data: NotificationLogInsert): Promise<NotificationLogRow> {
  const supabase = createAdminClient();
  const { data: log, error } = await supabase
    .from("notification_logs")
    .insert(data)
    .select()
    .single();

  if (error || !log) throw error || new Error("Failed to create notification log");
  return log;
}

export async function updateNotificationLog(
  id: string,
  data: NotificationLogUpdate
): Promise<NotificationLogRow> {
  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("notification_logs")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) throw error || new Error(`Failed to update notification log ${id}`);
  return updated;
}

export async function findNotificationLogById(id: string): Promise<NotificationLogRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_logs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findNotificationLogByIdempotencyKey(
  idempotencyKey: string
): Promise<NotificationLogRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_logs")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findCustomerNotificationLogs(customerId: string): Promise<NotificationLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_logs")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function findNotificationTemplate(
  eventType: string,
  channel: string = "email"
): Promise<NotificationTemplateRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .eq("event_type", eventType)
    .eq("channel", channel)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listNotificationLogs(options?: {
  limit?: number;
  status?: string;
  orderId?: string;
  customerId?: string;
}): Promise<NotificationLogRow[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("notification_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.orderId) {
    query = query.eq("order_id", options.orderId);
  }
  if (options?.customerId) {
    query = query.eq("customer_id", options.customerId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
