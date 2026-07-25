import "server-only";
import { createClient } from "../supabase/server";
import type { Database } from "@/types";

export type PromotionRow = Database["public"]["Tables"]["promotions"]["Row"];
export type CouponCodeRow = Database["public"]["Tables"]["coupon_codes"]["Row"];

export type CouponCodeWithPromotion = CouponCodeRow & {
  promotion: PromotionRow | null;
};

export async function findCouponByCode(code: string): Promise<CouponCodeWithPromotion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coupon_codes")
    .select("*, promotion:promotions(*)")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error || !data) return null;
  return data as CouponCodeWithPromotion;
}

export async function incrementCouponUsage(couponId: string): Promise<CouponCodeRow> {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("coupon_codes")
    .select("current_uses")
    .eq("id", couponId)
    .single();

  if (fetchError || !existing) throw fetchError || new Error("Coupon code not found");

  const { data, error } = await supabase
    .from("coupon_codes")
    .update({ current_uses: existing.current_uses + 1 })
    .eq("id", couponId)
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to increment coupon usage");
  return data;
}
