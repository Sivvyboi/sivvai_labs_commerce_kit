import "server-only";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type PaymentAttemptRow = Database["public"]["Tables"]["payment_attempts"]["Row"];
export type PaymentAttemptInsert = Database["public"]["Tables"]["payment_attempts"]["Insert"];
export type PaymentAttemptUpdate = Database["public"]["Tables"]["payment_attempts"]["Update"];
export type PaymentEventRow = Database["public"]["Tables"]["payment_events"]["Row"];
export type PaymentEventInsert = Database["public"]["Tables"]["payment_events"]["Insert"];

export async function createPaymentAttempt(data: PaymentAttemptInsert): Promise<PaymentAttemptRow> {
  const supabase = createAdminClient();
  const { data: attempt, error } = await supabase
    .from("payment_attempts")
    .insert(data)
    .select()
    .single();

  if (error || !attempt) throw error || new Error("Failed to create payment attempt");
  return attempt;
}

export async function updatePaymentAttempt(
  id: string,
  data: PaymentAttemptUpdate
): Promise<PaymentAttemptRow> {
  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("payment_attempts")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update payment attempt");
  return updated;
}

export async function findPaymentAttemptByReference(
  reference: string
): Promise<PaymentAttemptRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("provider_reference", reference)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function findPaymentAttemptByIdempotencyKey(
  idempotencyKey: string
): Promise<PaymentAttemptRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function logPaymentEvent(
  data: PaymentEventInsert
): Promise<PaymentEventRow> {
  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("payment_events")
    .insert(data)
    .select()
    .single();

  if (error || !event) throw error || new Error("Failed to log payment event");
  return event;
}
