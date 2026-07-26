import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type InventoryRecordRow = Database["public"]["Tables"]["inventory_records"]["Row"];
export type InventoryReservationRow = Database["public"]["Tables"]["inventory_reservations"]["Row"];
export type StockMovementRow = Database["public"]["Tables"]["stock_movements"]["Row"];

export async function getVariantInventory(variantId: string): Promise<InventoryRecordRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_records")
    .select("*")
    .eq("variant_id", variantId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createReservation(params: {
  inventoryRecordId: string;
  variantId: string;
  checkoutSessionId: string;
  quantity: number;
  expiresAt: string;
}): Promise<InventoryReservationRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inventory_reservations")
    .insert({
      inventory_record_id: params.inventoryRecordId,
      variant_id: params.variantId,
      checkout_session_id: params.checkoutSessionId,
      quantity: params.quantity,
      expires_at: params.expiresAt,
      status: "active",
    })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to create reservation");
  return data;
}

export async function updateReservationStatus(
  reservationId: string,
  status: Database["public"]["Enums"]["reservation_status"]
): Promise<InventoryReservationRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inventory_reservations")
    .update({ status })
    .eq("id", reservationId)
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to update reservation status");
  return data;
}

export async function releaseReservation(reservationId: string): Promise<InventoryReservationRow> {
  return updateReservationStatus(reservationId, "released");
}

export async function logStockMovement(params: {
  inventoryRecordId: string;
  movementType: string;
  quantityDelta: number;
  reason?: string;
  referenceId?: string;
}): Promise<StockMovementRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      inventory_record_id: params.inventoryRecordId,
      movement_type: params.movementType,
      quantity_delta: params.quantityDelta,
      reason: params.reason ?? null,
      reference_id: params.referenceId ?? null,
    })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to log stock movement");
  return data;
}

export async function updateInventoryOnHand(
  inventoryRecordId: string,
  onHandQuantity: number
): Promise<InventoryRecordRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inventory_records")
    .update({ on_hand_quantity: onHandQuantity })
    .eq("id", inventoryRecordId)
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to update inventory level");
  return data;
}
