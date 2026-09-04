import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";
import { InsufficientStockError } from "@/lib/errors";

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
  status: Database["public"]["Enums"]["reservation_status"],
  releasedAt?: string
): Promise<InventoryReservationRow> {
  const supabase = createAdminClient();
  const updateData: {
    status: Database["public"]["Enums"]["reservation_status"];
    released_at?: string;
  } = { status };
  if (status === "released") {
    updateData.released_at = releasedAt ?? new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("inventory_reservations")
    .update(updateData)
    .eq("id", reservationId)
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to update reservation status");
  return data;
}

export async function releaseReservation(reservationId: string): Promise<InventoryReservationRow> {
  return updateReservationStatus(reservationId, "released");
}

export async function findReservationById(reservationId: string): Promise<InventoryReservationRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inventory_reservations")
    .select("*")
    .eq("id", reservationId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function findReservationsByInventoryRecordId(
  inventoryRecordId: string,
  options?: { status?: Database["public"]["Enums"]["reservation_status"] }
): Promise<InventoryReservationRow[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("inventory_reservations")
    .select("*")
    .eq("inventory_record_id", inventoryRecordId)
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
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

// ---------------------------------------------------------------------------
// Atomic reservation (Phase 4)
// ---------------------------------------------------------------------------

export interface AtomicReservationItem {
  variant_id: string;
  quantity: number;
}

export interface AtomicReservationResult {
  reservation_id: string;
  inventory_record_id: string;
  variant_id: string;
  quantity: number;
  expires_at: string;
}

/**
 * Calls the `reserve_inventory_items` DB RPC to atomically reserve stock for
 * all items in a checkout in a single transaction.
 *
 * The RPC uses pg_advisory_xact_lock + SELECT FOR UPDATE to serialise
 * concurrent reservation attempts on the same variant, eliminating the
 * TOCTOU race present in application-level check-then-insert sequences.
 *
 * If any item has insufficient stock the RPC raises a structured exception
 * (`INSUFFICIENT_STOCK:variant=...:requested=...:available=...`) and the
 * entire transaction rolls back — no partial reservations are created.
 *
 * Throws InsufficientStockError for stock failures; re-throws other DB errors
 * as-is so callers can handle them appropriately.
 */
export async function reserveInventoryItems(
  checkoutSessionId: string,
  items: AtomicReservationItem[],
  durationMinutes = 15
): Promise<AtomicReservationResult[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc(
    "reserve_inventory_items" as never,
    {
      p_checkout_session_id: checkoutSessionId,
      p_items: items,
      p_duration_minutes: durationMinutes,
    } as never
  );

  if (error) {
    // Parse the structured exception message from the RPC.
    const msg: string = error.message ?? "";

    // Pattern: INSUFFICIENT_STOCK:variant=<uuid>:requested=<n>:available=<n>
    const stockMatch = msg.match(
      /INSUFFICIENT_STOCK:variant=([^:]+):requested=(\d+):available=(\d+)/
    );
    if (stockMatch) {
      const variantId = stockMatch[1];
      const requested = parseInt(stockMatch[2], 10);
      const available = parseInt(stockMatch[3], 10);
      throw new InsufficientStockError(variantId, requested, available);
    }

    // Pattern: NO_INVENTORY_RECORD:variant=<uuid>
    const noRecordMatch = msg.match(/NO_INVENTORY_RECORD:variant=([^\s]+)/);
    if (noRecordMatch) {
      throw new Error(
        `No inventory record found for variant ${noRecordMatch[1]}. ` +
        `Ensure the variant was created through the authoritative path.`
      );
    }

    throw error;
  }

  return (data as unknown as AtomicReservationResult[]) ?? [];
}

