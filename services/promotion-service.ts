import * as promotionRepo from "@/lib/db/promotions";
import { ValidationError } from "@/lib/errors";

export async function validateAndApplyPromoCode(code: string, subtotal: number) {
  const coupon = await promotionRepo.findCouponByCode(code.toUpperCase());
  if (!coupon || !coupon.promotion) {
    throw new ValidationError(`Invalid promotion code: ${code}`);
  }

  const promo = coupon.promotion;

  if (!promo.is_active) {
    throw new ValidationError("This promotion is no longer active");
  }

  const now = new Date();
  if (promo.starts_at && new Date(promo.starts_at) > now) {
    throw new ValidationError("Promotion has not started yet");
  }
  if (promo.ends_at && new Date(promo.ends_at) < now) {
    throw new ValidationError("Promotion code has expired");
  }

  // Check usage limit
  if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
    throw new ValidationError("Promotion code has reached its usage limit");
  }

  let discountAmount = 0;
  if (promo.type === "fixed_amount") {
    discountAmount = Number(promo.value);
  } else if (promo.type === "percentage") {
    discountAmount = (subtotal * Number(promo.value)) / 100;
  }

  discountAmount = Math.min(discountAmount, subtotal);

  return {
    coupon,
    promotion: promo,
    discountAmount,
  };
}

export async function recordCouponUsage(couponId: string) {
  return promotionRepo.incrementCouponUsage(couponId);
}
