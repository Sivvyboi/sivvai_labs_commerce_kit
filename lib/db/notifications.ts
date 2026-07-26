import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type NotificationLogRow = Database["public"]["Tables"]["notification_logs"]["Row"];
export type NotificationLogInsert = Database["public"]["Tables"]["notification_logs"]["Insert"];

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
