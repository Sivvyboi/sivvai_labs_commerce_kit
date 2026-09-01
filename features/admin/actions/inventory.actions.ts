"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/admin-guard";
import { logAuditEvent } from "@/services/authz-service";
import * as inventoryService from "@/services/inventory-service";
import {
  UpdateInventoryAdminSchema,
  type UpdateInventoryAdminInput,
  ReleaseInventoryReservationSchema,
  type ReleaseInventoryReservationInput,
} from "@/lib/validation/admin";

export async function updateInventoryAction(input: UpdateInventoryAdminInput) {
  try {
    await requirePermission("manage_inventory");
    const validated = UpdateInventoryAdminSchema.parse(input);
    const updated = await inventoryService.manualInventoryAdjustment({
      inventoryRecordId: validated.inventory_record_id,
      variantId: validated.variant_id,
      newQuantity: validated.new_quantity,
      reason: validated.reason,
    });

    await logAuditEvent({
      action: "inventory.adjust",
      entityType: "inventory_record",
      entityId: validated.inventory_record_id,
      metadata: { new_quantity: validated.new_quantity, reason: validated.reason },
    });

    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    return { success: true, inventory: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to adjust inventory",
    };
  }
}

export async function getActiveReservationsAction(inventoryRecordId: string) {
  try {
    await requirePermission("manage_inventory");
    const reservations = await inventoryService.getActiveReservations(inventoryRecordId);
    return { success: true, data: reservations };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load reservations",
    };
  }
}

export async function releaseInventoryReservationAction(input: ReleaseInventoryReservationInput) {
  try {
    await requirePermission("manage_inventory");
    const validated = ReleaseInventoryReservationSchema.parse(input);

    const released = await inventoryService.releaseInventoryReservation({
      reservationId: validated.reservation_id,
      expectedInventoryRecordId: validated.inventory_record_id,
    });

    await logAuditEvent({
      action: "inventory_reservation.release",
      entityType: "inventory_reservation",
      entityId: validated.reservation_id,
      metadata: {
        inventory_record_id: released.inventory_record_id,
        variant_id: released.variant_id,
        quantity: released.quantity,
        checkout_session_id: released.checkout_session_id,
      },
    });

    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    return { success: true, data: released };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to release reservation",
    };
  }
}
