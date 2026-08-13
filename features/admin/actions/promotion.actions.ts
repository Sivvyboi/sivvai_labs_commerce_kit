"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/admin-guard";
import { logAuditEvent } from "@/services/authz-service";
import * as promotionService from "@/services/promotion-service";
import {
  CreatePromotionAdminSchema,
  UpdatePromotionAdminSchema,
  type CreatePromotionAdminInput,
  type UpdatePromotionAdminInput,
} from "@/lib/validation/admin";

export async function createPromotionAction(input: CreatePromotionAdminInput) {
  try {
    await requirePermission("manage_promotions");
    const validated = CreatePromotionAdminSchema.parse(input);
    const promotion = await promotionService.createPromotionAdmin(
      {
        name: validated.name,
        type: validated.type,
        value: validated.value,
        starts_at: validated.starts_at ?? null,
        ends_at: validated.ends_at ?? null,
        is_active: validated.is_active,
      },
      validated.code,
      validated.max_uses ?? null
    );

    await logAuditEvent({
      action: "promotion.create",
      entityType: "promotion",
      entityId: promotion.id,
      metadata: { code: validated.code },
    });

    revalidatePath("/admin/promotions");
    revalidatePath("/admin");
    return { success: true, promotion };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create promotion",
    };
  }
}

export async function updatePromotionAction(input: UpdatePromotionAdminInput) {
  try {
    await requirePermission("manage_promotions");
    const validated = UpdatePromotionAdminSchema.parse(input);
    const { id, ...data } = validated;
    const updated = await promotionService.updatePromotionAdmin(id, {
      ...data,
      starts_at: data.starts_at ?? undefined,
      ends_at: data.ends_at ?? undefined,
    });

    await logAuditEvent({
      action: "promotion.update",
      entityType: "promotion",
      entityId: id,
    });

    revalidatePath("/admin/promotions");
    return { success: true, promotion: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update promotion",
    };
  }
}

export async function togglePromotionActiveAction(id: string, isActive: boolean) {
  try {
    await requirePermission("manage_promotions");
    const updated = await promotionService.togglePromotionActive(id, isActive);

    await logAuditEvent({
      action: "promotion.toggle_active",
      entityType: "promotion",
      entityId: id,
      metadata: { is_active: isActive },
    });

    revalidatePath("/admin/promotions");
    revalidatePath("/admin");
    return { success: true, promotion: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle promotion state",
    };
  }
}

export async function deletePromotionAction(id: string) {
  try {
    await requirePermission("manage_promotions");
    await promotionService.deletePromotionAdmin(id);

    await logAuditEvent({
      action: "promotion.delete",
      entityType: "promotion",
      entityId: id,
    });

    revalidatePath("/admin/promotions");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete promotion",
    };
  }
}
