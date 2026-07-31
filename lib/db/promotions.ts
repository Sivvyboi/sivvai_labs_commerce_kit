import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import type { Database } from "@/types";

export type PromotionInsert = Database["public"]["Tables"]["promotions"]["Insert"];
export type PromotionUpdate = Database["public"]["Tables"]["promotions"]["Update"];
export type CouponCodeInsert = Database["public"]["Tables"]["coupon_codes"]["Insert"];


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
  const supabase = createAdminClient();
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

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export type PromotionWithCoupon = PromotionRow & {
  coupon_codes: CouponCodeRow[];
};

export async function findAllPromotions(): Promise<PromotionWithCoupon[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promotions")
    .select("*, coupon_codes(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PromotionWithCoupon[];
}

export async function createPromotionWithCoupon(
  promoData: PromotionInsert,
  code: string,
  maxUses?: number | null
): Promise<PromotionWithCoupon> {
  const supabase = createAdminClient();

  const { data: promo, error: promoError } = await supabase
    .from("promotions")
    .insert(promoData)
    .select()
    .single();

  if (promoError || !promo) throw promoError || new Error("Failed to create promotion");

  const { data: coupon, error: couponError } = await supabase
    .from("coupon_codes")
    .insert({
      promotion_id: promo.id,
      code: code.toUpperCase(),
      max_uses: maxUses ?? null,
      current_uses: 0,
    })
    .select()
    .single();

  if (couponError || !coupon) throw couponError || new Error("Failed to create coupon code");

  return {
    ...promo,
    coupon_codes: [coupon],
  };
}

export async function updatePromotion(id: string, data: PromotionUpdate): Promise<PromotionRow> {
  const supabase = createAdminClient();
  const { data: updated, error } = await supabase
    .from("promotions")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) throw error || new Error("Failed to update promotion");
  return updated;
}

export async function deletePromotion(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw error;
  return true;
}

