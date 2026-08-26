import "server-only";
import { createClient } from "../supabase/server";
import type { Database } from "@/types";

export type CheckoutSessionRow = Database["public"]["Tables"]["checkout_sessions"]["Row"];
export type CheckoutSessionInsert = Database["public"]["Tables"]["checkout_sessions"]["Insert"];
export type CheckoutSessionUpdate = Database["public"]["Tables"]["checkout_sessions"]["Update"];

export async function createCheckoutSession(
  data: CheckoutSessionInsert
): Promise<CheckoutSessionRow> {
  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("checkout_sessions")
    .insert(data)
    .select()
    .single();

  if (error || !session) throw error || new Error("Failed to create checkout session");
  return session;
}

export async function findCheckoutSessionById(
  id: string
): Promise<CheckoutSessionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function updateCheckoutSession(
  id: string,
  data: CheckoutSessionUpdate
): Promise<CheckoutSessionRow> {
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("checkout_sessions")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update checkout session");
  return updated;
}
