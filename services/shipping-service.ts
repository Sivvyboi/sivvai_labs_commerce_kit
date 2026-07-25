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

export async function calculateShippingRate(methodId: string, subtotal: number): Promise<number> {
  const rates = await shippingRepo.findShippingRatesByZone(methodId);
  const rate = rates[0];
  if (!rate) return 0;

  if (rate.free_above_order_total !== null && subtotal >= rate.free_above_order_total) {
    return 0;
  }

  return rate.flat_amount;
}
