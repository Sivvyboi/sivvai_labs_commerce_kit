"use server";

/**
 * features/admin/actions/shipping.actions.ts
 *
 * Typed Server Actions for Admin Shipping & Fulfilment operations.
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth/admin-guard";
import { logAuditEvent } from "@/services/authz-service";

import * as shippingService from "@/services/shipping-service";
import {
  CreateShippingZoneSchema,
  UpdateShippingZoneSchema,
  CreateFulfilmentMethodSchema,
  UpdateFulfilmentMethodSchema,
  UpsertShippingRateSchema,
  type CreateShippingZoneInput,
  type UpdateShippingZoneInput,
  type CreateFulfilmentMethodInput,
  type UpdateFulfilmentMethodInput,
  type UpsertShippingRateInput,
} from "@/lib/validation/admin";

// ---------------------------------------------------------------------------
// Shipping Zones
// ---------------------------------------------------------------------------

export async function createShippingZoneAction(input: CreateShippingZoneInput) {
  try {
    await requirePermission("manage_shipping");
    const validated = CreateShippingZoneSchema.parse(input);
    const zone = await shippingService.createShippingZoneAdmin(validated);

    await logAuditEvent({
      action: "shipping_zone.create",
      entityType: "shipping_zone",
      entityId: zone.id,
      metadata: { name: zone.name, regions: zone.regions },
    });

    revalidateTag("shipping", "default");
    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    return { success: true, zone };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create shipping zone",
    };
  }
}

export async function updateShippingZoneAction(input: UpdateShippingZoneInput) {
  try {
    await requirePermission("manage_shipping");
    const validated = UpdateShippingZoneSchema.parse(input);
    const { id, ...data } = validated;
    const zone = await shippingService.updateShippingZoneAdmin(id, data);

    await logAuditEvent({
      action: "shipping_zone.update",
      entityType: "shipping_zone",
      entityId: id,
      metadata: data,
    });

    revalidateTag("shipping", "default");
    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    return { success: true, zone };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update shipping zone",
    };
  }
}

export async function deleteShippingZoneAction(id: string) {
  try {
    await requirePermission("manage_shipping");
    await shippingService.deleteShippingZoneAdmin(id);

    await logAuditEvent({
      action: "shipping_zone.delete",
      entityType: "shipping_zone",
      entityId: id,
    });

    revalidateTag("shipping", "default");
    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete shipping zone",
    };
  }
}

// ---------------------------------------------------------------------------
// Fulfilment Methods
// ---------------------------------------------------------------------------

export async function createFulfilmentMethodAction(input: CreateFulfilmentMethodInput) {
  try {
    await requirePermission("manage_shipping");
    const validated = CreateFulfilmentMethodSchema.parse(input);
    const method = await shippingService.createFulfilmentMethodAdmin(validated);

    await logAuditEvent({
      action: "fulfilment_method.create",
      entityType: "fulfilment_method",
      entityId: method.id,
      metadata: { name: method.name, type: method.type },
    });

    revalidateTag("shipping", "default");
    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    revalidatePath("/api/shipping/methods");
    return { success: true, method };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create fulfilment method",
    };
  }
}

export async function updateFulfilmentMethodAction(input: UpdateFulfilmentMethodInput) {
  try {
    await requirePermission("manage_shipping");
    const validated = UpdateFulfilmentMethodSchema.parse(input);
    const { id, ...data } = validated;
    const method = await shippingService.updateFulfilmentMethodAdmin(id, data);

    await logAuditEvent({
      action: "fulfilment_method.update",
      entityType: "fulfilment_method",
      entityId: id,
      metadata: data,
    });

    revalidateTag("shipping", "default");
    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    revalidatePath("/api/shipping/methods");
    return { success: true, method };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update fulfilment method",
    };
  }
}

export async function toggleFulfilmentMethodStatusAction(id: string, isEnabled: boolean) {
  try {
    await requirePermission("manage_shipping");
    const method = await shippingService.updateFulfilmentMethodAdmin(id, { is_enabled: isEnabled });

    await logAuditEvent({
      action: "fulfilment_method.toggle_status",
      entityType: "fulfilment_method",
      entityId: id,
      metadata: { is_enabled: isEnabled },
    });

    revalidateTag("shipping", "default");
    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    revalidatePath("/api/shipping/methods");
    return { success: true, method };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle fulfilment method status",
    };
  }
}

export async function deleteFulfilmentMethodAction(id: string) {
  try {
    await requirePermission("manage_shipping");
    await shippingService.deleteFulfilmentMethodAdmin(id);

    await logAuditEvent({
      action: "fulfilment_method.delete",
      entityType: "fulfilment_method",
      entityId: id,
    });

    revalidateTag("shipping", "default");
    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    revalidatePath("/api/shipping/methods");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete fulfilment method",
    };
  }
}

// ---------------------------------------------------------------------------
// Shipping Rates
// ---------------------------------------------------------------------------

export async function upsertShippingRateAction(input: UpsertShippingRateInput) {
  try {
    await requirePermission("manage_shipping");
    const validated = UpsertShippingRateSchema.parse(input);
    const rate = await shippingService.upsertShippingRateAdmin(validated);

    await logAuditEvent({
      action: "shipping_rate.upsert",
      entityType: "shipping_rate",
      entityId: rate.id,
      metadata: validated,
    });

    revalidateTag("shipping", "default");
    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    return { success: true, rate };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save shipping rate",
    };
  }
}

export async function deleteShippingRateAction(id: string) {
  try {
    await requirePermission("manage_shipping");
    await shippingService.deleteShippingRateAdmin(id);

    await logAuditEvent({
      action: "shipping_rate.delete",
      entityType: "shipping_rate",
      entityId: id,
    });

    revalidateTag("shipping", "default");
    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete shipping rate",
    };
  }
}
