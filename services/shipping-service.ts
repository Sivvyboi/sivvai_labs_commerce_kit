import * as shippingRepo from "@/lib/db/shipping";
import { NotFoundError } from "@/lib/errors";

export async function getShippingOptions() {
  return shippingRepo.findShippingZones();
}

export async function getFulfilmentMethod(methodId: string) {
  const method = await shippingRepo.findFulfilmentMethodById(methodId);
  if (!method) {
    throw new NotFoundError("FulfilmentMethod", methodId);
  }
  return method;
}

export async function calculateShippingRate(
  methodId: string,
  subtotal: number,
  destinationState?: string
): Promise<number> {
  const zone = await shippingRepo.findMatchingShippingZone(destinationState);
  if (!zone) return 0;

  let rate = await shippingRepo.findShippingRateForMethodAndZone(methodId, zone.id);
  if (!rate) {
    const rates = await shippingRepo.findShippingRatesByZone(zone.id);
    rate = rates[0] ?? null;
  }

  if (!rate) return 0;

  if (rate.free_above_order_total !== null && subtotal >= rate.free_above_order_total) {
    return 0;
  }

  return rate.flat_amount;
}

// ---------------------------------------------------------------------------
// Admin Domain Methods
// ---------------------------------------------------------------------------

export async function getAllShippingZonesAdmin() {
  return shippingRepo.adminFindAllShippingZones();
}

export async function createShippingZoneAdmin(input: {
  name: string;
  regions: string[];
}) {
  return shippingRepo.adminCreateShippingZone({
    name: input.name.trim(),
    regions: input.regions.map((r) => r.trim()).filter(Boolean),
  });
}

export async function updateShippingZoneAdmin(
  id: string,
  input: {
    name?: string;
    regions?: string[];
  }
) {
  const payload: shippingRepo.ShippingZoneUpdate = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.regions !== undefined) {
    payload.regions = input.regions.map((r) => r.trim()).filter(Boolean);
  }

  return shippingRepo.adminUpdateShippingZone(id, payload);
}

export async function deleteShippingZoneAdmin(id: string) {
  return shippingRepo.adminDeleteShippingZone(id);
}

export async function getAllFulfilmentMethodsAdmin() {
  return shippingRepo.adminFindAllFulfilmentMethods();
}

export async function createFulfilmentMethodAdmin(input: {
  type: string;
  name: string;
  description?: string | null;
  is_enabled?: boolean;
  estimated_days_min?: number;
  estimated_days_max?: number;
}) {
  return shippingRepo.adminCreateFulfilmentMethod({
    type: input.type,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    is_enabled: input.is_enabled ?? true,
    estimated_days_min: input.estimated_days_min ?? 1,
    estimated_days_max: input.estimated_days_max ?? 5,
  });
}

export async function updateFulfilmentMethodAdmin(
  id: string,
  input: {
    type?: string;
    name?: string;
    description?: string | null;
    is_enabled?: boolean;
    estimated_days_min?: number;
    estimated_days_max?: number;
  }
) {
  const payload: shippingRepo.FulfilmentMethodUpdate = {};
  if (input.type !== undefined) payload.type = input.type;
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null;
  }
  if (input.is_enabled !== undefined) payload.is_enabled = input.is_enabled;
  if (input.estimated_days_min !== undefined) {
    payload.estimated_days_min = input.estimated_days_min;
  }
  if (input.estimated_days_max !== undefined) {
    payload.estimated_days_max = input.estimated_days_max;
  }

  return shippingRepo.adminUpdateFulfilmentMethod(id, payload);
}

export async function deleteFulfilmentMethodAdmin(id: string) {
  const isReferenced = await shippingRepo.hasFulfilmentMethodCheckoutReferences(id);
  if (isReferenced) {
    throw new Error(
      "Cannot delete this fulfilment method because it is referenced by existing checkout records. Please disable it instead."
    );
  }
  return shippingRepo.adminDeleteFulfilmentMethod(id);
}

export async function upsertShippingRateAdmin(input: {
  id?: string;
  fulfilment_method_id: string;
  zone_id: string;
  rate_type?: string;
  flat_amount?: number;
  per_kg_amount?: number;
  free_above_order_total?: number | null;
}) {
  return shippingRepo.adminUpsertShippingRate({
    id: input.id,
    fulfilment_method_id: input.fulfilment_method_id,
    zone_id: input.zone_id,
    rate_type: input.rate_type ?? "flat",
    flat_amount: input.flat_amount ?? 0,
    per_kg_amount: input.per_kg_amount ?? 0,
    free_above_order_total: input.free_above_order_total ?? null,
  });
}

export async function deleteShippingRateAdmin(id: string) {
  return shippingRepo.adminDeleteShippingRate(id);
}

