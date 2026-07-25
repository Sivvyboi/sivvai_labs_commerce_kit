import "server-only";
import { createClient } from "../supabase/server";
import type { Database } from "@/types";
import type { ProductRow, ProductVariantRow } from "./products";

export type CartRow = Database["public"]["Tables"]["carts"]["Row"];
export type CartLineRow = Database["public"]["Tables"]["cart_lines"]["Row"];

export type CartLineWithVariant = CartLineRow & {
  variant: (ProductVariantRow & { product: ProductRow | null }) | null;
};

export type CartWithLines = CartRow & {
  items: CartLineWithVariant[];
};

export async function findCartById(id: string): Promise<CartWithLines | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("carts")
    .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*)))")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as CartWithLines;
}

export async function findCartByCustomerId(customerId: string): Promise<CartWithLines | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("carts")
    .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*)))")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as CartWithLines;
}

export async function createCart(customerId?: string): Promise<CartRow> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("carts")
    .insert({ customer_id: customerId ?? null, status: "active", expires_at: expiresAt })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to create cart");
  return data;
}

export async function addCartItem(params: {
  cartId: string;
  variantId: string;
  quantity: number;
  unitPriceSnapshot: number;
}): Promise<CartLineRow> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("cart_lines")
    .select("*")
    .eq("cart_id", params.cartId)
    .eq("variant_id", params.variantId)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("cart_lines")
      .update({ quantity: existing.quantity + params.quantity })
      .eq("id", existing.id)
      .select()
      .single();

    if (error || !updated) throw error || new Error("Failed to update cart line");
    return updated;
  }

  const { data: inserted, error } = await supabase
    .from("cart_lines")
    .insert({
      cart_id: params.cartId,
      variant_id: params.variantId,
      quantity: params.quantity,
      unit_price_snapshot: params.unitPriceSnapshot,
    })
    .select()
    .single();

  if (error || !inserted) throw error || new Error("Failed to insert cart line");
  return inserted;
}

export async function updateCartItemQuantity(
  cartLineId: string,
  quantity: number
): Promise<CartLineRow | { success: boolean }> {
  if (quantity <= 0) {
    return removeCartItem(cartLineId);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cart_lines")
    .update({ quantity })
    .eq("id", cartLineId)
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to update cart item quantity");
  return data;
}

export async function removeCartItem(cartLineId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("cart_lines").delete().eq("id", cartLineId);
  if (error) throw error;
  return { success: true };
}

export async function clearCart(cartId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.from("cart_lines").delete().eq("cart_id", cartId);
  if (error) throw error;
  return { success: true };
}
