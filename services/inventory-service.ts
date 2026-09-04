import * as inventoryRepo from "@/lib/db/inventory";
import type { InventoryReservationRow } from "@/lib/db/inventory";
import type { AtomicReservationResult } from "@/lib/db/inventory";
import {
  InsufficientStockError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";

export async function checkAvailableStock(variantId: string): Promise<number> {
  const inv = await inventoryRepo.getVariantInventory(variantId);
  // Missing inventory record is NEVER treated as untracked/unlimited stock
  if (!inv) return 0;
  if (!inv.track_inventory || inv.allow_backorders) return 9999;
  return Math.max(0, inv.on_hand_quantity - inv.reserved_quantity);
}

export async function verifyStockAvailability(
  variantId: string,
  requestedQuantity: number
): Promise<true> {
  const available = await checkAvailableStock(variantId);
  if (available < requestedQuantity) {
    throw new InsufficientStockError(variantId, requestedQuantity, available);
  }
  return true;
}

/**
 * Atomically reserves inventory for all items in a checkout session.
 *
 * Delegates to the `reserve_inventory_items` PostgreSQL RPC which uses
 * pg_advisory_xact_lock + SELECT FOR UPDATE to serialise concurrent
 * reservation attempts and eliminate the TOCTOU race present in the
 * previous check-then-insert application-level sequence.
 *
 * If any item has insufficient stock the RPC rolls back the entire
 * reservation batch — no partial reservations are ever created.
 *
 * Returns a list of reservation results compatible with the rest of the
 * checkout flow. Note: these are not full InventoryReservationRow objects
 * (they lack fields like `created_at`, `released_at`) — callers that need
 * the full row should query by reservation_id.
 */
export async function reserveInventoryForCheckout(
  checkoutSessionId: string,
  items: Array<{ variantId: string; quantity: number }>,
  durationMinutes = 15
): Promise<AtomicReservationResult[]> {
  // Map to the shape the RPC expects.
  const rpcItems = items.map((i) => ({
    variant_id: i.variantId,
    quantity: i.quantity,
  }));

  // Throws InsufficientStockError or a DB error if anything fails.
  // On success, all items are reserved in a single atomic transaction.
  return inventoryRepo.reserveInventoryItems(
    checkoutSessionId,
    rpcItems,
    durationMinutes
  );
}

export async function finalizeStockDeduction(params: {
  variantId: string;
  quantity: number;
  orderId: string;
  reservationId?: string;
}) {
  const inv = await inventoryRepo.getVariantInventory(params.variantId);
  if (!inv) return;

  const newQty = Math.max(0, inv.on_hand_quantity - params.quantity);

  // 1. Update inventory level
  await inventoryRepo.updateInventoryOnHand(inv.id, newQty);

  // 2. Log stock movement
  await inventoryRepo.logStockMovement({
    inventoryRecordId: inv.id,
    movementType: "outbound",
    quantityDelta: -params.quantity,
    reason: "order_fulfilled",
    referenceId: params.orderId,
  });

  // 3. Mark reservation converted if provided
  if (params.reservationId) {
    await inventoryRepo.updateReservationStatus(params.reservationId, "converted");
  }
}

export async function cancelReservation(reservationId: string) {
  return inventoryRepo.releaseReservation(reservationId);
}

export async function getActiveReservations(inventoryRecordId: string): Promise<InventoryReservationRow[]> {
  return inventoryRepo.findReservationsByInventoryRecordId(inventoryRecordId, { status: "active" });
}

export async function releaseInventoryReservation(params: {
  reservationId: string;
  expectedInventoryRecordId?: string;
}): Promise<InventoryReservationRow> {
  const reservation = await inventoryRepo.findReservationById(params.reservationId);
  if (!reservation) {
    throw new NotFoundError("InventoryReservation", params.reservationId);
  }

  if (params.expectedInventoryRecordId && reservation.inventory_record_id !== params.expectedInventoryRecordId) {
    throw new ValidationError("Reservation does not belong to the specified inventory record");
  }

  if (reservation.status !== "active") {
    throw new ConflictError(`Reservation is already ${reservation.status} and cannot be released.`);
  }

  return inventoryRepo.releaseReservation(params.reservationId);
}

// ---------------------------------------------------------------------------
// Admin service functions
// ---------------------------------------------------------------------------

export async function getInventoryWithVariants() {
  return inventoryRepo.findAllInventoryWithVariants();
}

export async function getLowStockItems(threshold = 5) {
  return inventoryRepo.findLowStockItems(threshold);
}

export async function getLowStockCount(threshold = 5) {
  return inventoryRepo.getLowStockCount(threshold);
}

/**
 * Admin manual stock adjustment.
 * Updates on_hand_quantity to the new value and logs a stock_movement record.
 */
export async function manualInventoryAdjustment(params: {
  inventoryRecordId: string;
  variantId: string;
  newQuantity: number;
  reason?: string;
}) {
  const inv = await inventoryRepo.getVariantInventory(params.variantId);
  if (!inv) throw new Error(`Inventory record not found for variant ${params.variantId}`);

  const delta = params.newQuantity - inv.on_hand_quantity;

  // Update on-hand quantity
  const updated = await inventoryRepo.updateInventoryOnHand(params.inventoryRecordId, params.newQuantity);

  // Log movement
  if (delta !== 0) {
    await inventoryRepo.logStockMovement({
      inventoryRecordId: params.inventoryRecordId,
      movementType: delta > 0 ? "inbound" : "outbound",
      quantityDelta: delta,
      reason: params.reason ?? "manual_adjustment",
    });
  }

  return updated;
}
