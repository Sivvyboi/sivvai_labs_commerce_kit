"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/admin-guard";
import { logAuditEvent } from "@/services/authz-service";
import * as inventoryService from "@/services/inventory-service";
import {
  UpdateInventoryAdminSchema,
  type UpdateInventoryAdminInput,
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
