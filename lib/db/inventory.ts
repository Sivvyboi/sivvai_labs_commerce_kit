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

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export interface InventoryWithVariant extends InventoryRecordRow {
  variant: {
    id: string;
    sku: string | null;
    price_override: number | null;
    product: {
      id: string;
      name: string;
      status: string;
      deleted_at?: string | null;
      images?: Array<{ url: string; is_primary: boolean }> | null;
    } | null;
  } | null;
}

/** Returns all inventory records joined with variant + product data for the admin table */
export async function findAllInventoryWithVariants(): Promise<InventoryWithVariant[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inventory_records")
    .select("*, variant:product_variants(id, sku, price_override, product:products(id, name, status, deleted_at, images:product_images(url, is_primary)))")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const items = (data ?? []) as unknown as InventoryWithVariant[];
  return items.filter((inv) => Boolean(inv.variant?.product && !inv.variant.product.deleted_at));
}

/**
 * Returns inventory records where available stock (on_hand - reserved) is at or below the threshold.
 * Excludes variants whose products are soft-deleted or archived.
 */
export async function findLowStockItems(threshold = 5): Promise<InventoryWithVariant[]> {
  const supabase = createAdminClient();
  // Supabase doesn't support computed column filters directly;
  // fetch candidates and filter in-process (counts are small)
  const { data, error } = await supabase
    .from("inventory_records")
    .select("*, variant:product_variants(id, sku, price_override, product:products(id, name, status, deleted_at, images:product_images(url, is_primary)))")
    .eq("track_inventory", true);

  if (error) throw error;

  return ((data ?? []) as unknown as InventoryWithVariant[]).filter((inv) => {
    if (!inv.variant?.product || inv.variant.product.deleted_at) return false;
    if (inv.variant.product.status === "archived") return false;
    const available = inv.on_hand_quantity - inv.reserved_quantity;
    return available <= threshold;
  });
}

/** Returns count of variants with low stock */
export async function getLowStockCount(threshold = 5): Promise<number> {
  const items = await findLowStockItems(threshold);
  return items.length;
}
