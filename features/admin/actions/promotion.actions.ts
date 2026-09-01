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

function parseDateInput(value: string | null | undefined, isEndDate = false): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Date-only string YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    if (isEndDate) {
      return `${trimmed}T23:59:59.999Z`;
    }
    return `${trimmed}T00:00:00.000Z`;
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed.toISOString();
}

export async function createPromotionAction(input: CreatePromotionAdminInput) {
  try {
    await requirePermission("manage_promotions");

    const validationResult = CreatePromotionAdminSchema.safeParse(input);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message || "Invalid promotion input",
      };
    }

    const validated = validationResult.data;

    const startsAt = parseDateInput(validated.starts_at, false);
    const endsAt = parseDateInput(validated.ends_at, true);

    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
      return {
        success: false,
        error: "Expiry date cannot be before start date",
      };
    }

    const promotion = await promotionService.createPromotionAdmin(
      {
        name: validated.name,
        type: validated.type,
        value: validated.value,
        starts_at: startsAt,
        ends_at: endsAt,
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
