"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/admin-guard";
import { logAuditEvent } from "@/services/authz-service";
import * as orderService from "@/services/order-service";
import { updateOrderStatus } from "@/lib/db/orders";
import {
  UpdateOrderStatusAdminSchema,
  AddOrderNoteAdminSchema,
  type UpdateOrderStatusAdminInput,
  type AddOrderNoteAdminInput,
} from "@/lib/validation/admin";

export async function updateOrderStatusAction(input: UpdateOrderStatusAdminInput) {
  try {
    await requirePermission("manage_orders");
    const validated = UpdateOrderStatusAdminSchema.parse(input);
    const updated = await updateOrderStatus(validated.order_id, validated.status);
    if (validated.note) {
      await orderService.addOrderNote(validated.order_id, `Status updated to ${validated.status}: ${validated.note}`);
    }

    await logAuditEvent({
      action: "order.update_status",
      entityType: "order",
      entityId: validated.order_id,
      metadata: { new_status: validated.status },
    });

    revalidatePath(`/admin/orders/${validated.order_id}`);
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { success: true, order: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update order status",
    };
  }
}

export async function addOrderNoteAction(input: AddOrderNoteAdminInput) {
  try {
    await requirePermission("manage_orders");
    const validated = AddOrderNoteAdminSchema.parse(input);
    const note = await orderService.addOrderNote(
      validated.order_id,
      validated.body,
      validated.author_type === "admin"
    );

    await logAuditEvent({
      action: "order.add_note",
      entityType: "order",
      entityId: validated.order_id,
    });

    revalidatePath(`/admin/orders/${validated.order_id}`);
    return { success: true, note };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add note",
    };
  }
}
