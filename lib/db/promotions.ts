import "server-only";
import { createPublicClient } from "../supabase/server";
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
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("coupon_codes")
    .select("*, promotion:promotions(*)")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error || !data) return null;
  return (data as unknown) as CouponCodeWithPromotion;
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
  return ((data ?? []) as unknown) as PromotionWithCoupon[];
}

export async function createPromotionWithCoupon(
  promoData: PromotionInsert,
  code: string,
  maxUses?: number | null
): Promise<PromotionWithCoupon> {
  const supabase = createAdminClient();
  const cleanCode = code.trim().toUpperCase();

  const { data, error } = await supabase.rpc("create_promotion_with_coupon_rpc" as never, {
    p_name: promoData.name,
    p_type: promoData.type,
    p_value: Number(promoData.value),
    p_code: cleanCode,
    p_max_uses: maxUses ?? null,
    p_starts_at: promoData.starts_at ?? null,
    p_ends_at: promoData.ends_at ?? null,
    p_is_active: promoData.is_active ?? true,
  } as never);

  if (error) {
    const errorMsg = (error as { message?: string }).message ?? "";
    const errorCode = (error as { code?: string }).code ?? "";
    if (errorCode === "23505" || errorMsg.includes("coupon_codes_code_key") || errorMsg.toLowerCase().includes("unique")) {
      throw new Error(`Coupon code "${cleanCode}" already exists.`);
    }
    throw new Error(errorMsg || "Failed to create promotion and coupon code");
  }

  if (!data) {
    throw new Error("Failed to create promotion and coupon code");
  }

  return (data as unknown) as PromotionWithCoupon;
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

