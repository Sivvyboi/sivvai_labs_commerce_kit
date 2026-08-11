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
