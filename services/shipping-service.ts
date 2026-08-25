import * as shippingRepo from "@/lib/db/shipping";
import { NotFoundError } from "@/lib/errors";

export interface ResolvedShippingOption {
  methodId: string;
  name: string;
  description: string | null;
  type: string;
  amount: number;
  isFree: boolean;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

export interface ShippingResolutionResult {
  serviceable: boolean;
  reason?: "unserviceable" | "no_methods" | "invalid_address";
  zone: {
    id: string;
    name: string;
  } | null;
  options: ResolvedShippingOption[];
}

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

/**
 * Server-authoritative resolution of available shipping options for a customer delivery address.
 */
export async function resolveShippingOptionsForAddress(
  destination: { state?: string; city?: string; country?: string } | string,
  subtotal: number
): Promise<ShippingResolutionResult> {
  const zone = await shippingRepo.findMatchingShippingZone(destination);
  if (!zone) {
    return {
      serviceable: false,
      reason: "unserviceable",
      zone: null,
      options: [],
    };
  }

  const ratesWithMethods = await shippingRepo.findShippingRatesWithMethodsByZone(zone.id);
  const activeMethods = await shippingRepo.findFulfilmentMethods();

  const options: ResolvedShippingOption[] = ratesWithMethods.map((item) => {
    const method = item.fulfilment_methods!;
    let amount = item.flat_amount;
    let isFree = false;

    if (item.rate_type === "free_above") {
      if (
        item.free_above_order_total !== null &&
        item.free_above_order_total !== undefined &&
        subtotal >= item.free_above_order_total
      ) {
        amount = 0;
        isFree = true;
      }
    }

    if (amount === 0) {
      isFree = true;
    }

    return {
      methodId: method.id,
      name: method.name,
      description: method.description,
      type: method.type,
      amount,
      isFree,
      estimatedDaysMin: method.estimated_days_min,
      estimatedDaysMax: method.estimated_days_max,
    };
  });

  // If any active pickup fulfilment methods exist in the store and are not yet in options, include them
  for (const method of activeMethods) {
    const isPickup =
      method.type === "local_pickup" ||
      method.type === "pickup" ||
      method.name.toLowerCase().includes("pickup");

    if (isPickup && !options.some((o) => o.methodId === method.id)) {
      options.push({
        methodId: method.id,
        name: method.name,
        description: method.description,
        type: method.type,
        amount: 0,
        isFree: true,
        estimatedDaysMin: method.estimated_days_min ?? 0,
        estimatedDaysMax: method.estimated_days_max ?? 1,
      });
    }
  }

  if (options.length === 0) {
    return {
      serviceable: false,
      reason: "no_methods",
      zone: {
        id: zone.id,
        name: zone.name,
      },
      options: [],
    };
  }

  return {
    serviceable: true,
    zone: {
      id: zone.id,
      name: zone.name,
    },
    options,
  };
}

/**
 * Server-authoritative calculation of shipping price for a specific method and destination address.
 * Re-validates that the method is active and has a configured rate for the matching zone.
 */
export async function calculateShippingRate(
  methodId: string,
  subtotal: number,
  destination?: { state?: string; city?: string; country?: string } | string
): Promise<number> {
  const zone = await shippingRepo.findMatchingShippingZone(destination);
  if (!zone) {
    throw new Error("We do not currently deliver to this destination address.");
  }

  const method = await shippingRepo.findFulfilmentMethodById(methodId);
  if (!method || !method.is_enabled) {
    throw new Error("The selected fulfilment method is not active.");
  }

  const rate = await shippingRepo.findShippingRateForMethodAndZone(methodId, zone.id);
  if (!rate) {
    const isPickup =
      method.type === "local_pickup" ||
      method.type === "pickup" ||
      method.name.toLowerCase().includes("pickup");

    if (isPickup) {
      return 0;
    }

    throw new Error("The selected shipping method is not available for your delivery zone.");
  }

  if (
    rate.rate_type === "free_above" &&
    rate.free_above_order_total !== null &&
    rate.free_above_order_total !== undefined &&
    subtotal >= rate.free_above_order_total
  ) {
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

