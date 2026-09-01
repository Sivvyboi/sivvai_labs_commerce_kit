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
    // promo.value is stored in minor units (Kobo); subtotal is in major units (Naira).
    // Divide by 100 to align units before clamping to subtotal.
    discountAmount = Number(promo.value) / 100;
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

// ---------------------------------------------------------------------------
// Admin service functions
// ---------------------------------------------------------------------------

export async function getAllPromotions() {
  return promotionRepo.findAllPromotions();
}

export async function createPromotionAdmin(
  promoData: promotionRepo.PromotionInsert,
  code: string,
  maxUses?: number | null
) {
  return promotionRepo.createPromotionWithCoupon(promoData, code, maxUses);
}

export async function updatePromotionAdmin(id: string, data: promotionRepo.PromotionUpdate) {
  return promotionRepo.updatePromotion(id, data);
}

export async function togglePromotionActive(id: string, isActive: boolean) {
  return promotionRepo.updatePromotion(id, { is_active: isActive });
}

export async function deletePromotionAdmin(id: string) {
  return promotionRepo.deletePromotion(id);
}

