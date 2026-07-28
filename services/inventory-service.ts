import * as inventoryRepo from "@/lib/db/inventory";
import type { InventoryReservationRow } from "@/lib/db/inventory";
import { InsufficientStockError } from "@/lib/errors";

export async function checkAvailableStock(variantId: string): Promise<number> {
  const inv = await inventoryRepo.getVariantInventory(variantId);
  if (!inv || !inv.track_inventory) return 9999;
  return inv.on_hand_quantity - inv.reserved_quantity;
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

export async function reserveInventoryForCheckout(
  checkoutSessionId: string,
  items: Array<{ variantId: string; quantity: number }>,
  durationMinutes = 15
): Promise<InventoryReservationRow[]> {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  const reservations: InventoryReservationRow[] = [];

  for (const item of items) {
    await verifyStockAvailability(item.variantId, item.quantity);

    const inv = await inventoryRepo.getVariantInventory(item.variantId);
    if (!inv) throw new InsufficientStockError(item.variantId, item.quantity, 0);

    const reservation = await inventoryRepo.createReservation({
      inventoryRecordId: inv.id,
      variantId: item.variantId,
      checkoutSessionId,
      quantity: item.quantity,
      expiresAt,
    });
    reservations.push(reservation);
  }

  return reservations;
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
