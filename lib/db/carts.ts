import "server-only";
import { createClient } from "../supabase/server";
import { getCartTokenHash } from "../auth/cart-token";
import { NotFoundError } from "../errors";
import type { Database } from "@/types";
import type { ProductRow, ProductVariantRow, ProductImageRow } from "./products";

export type CartRow = Database["public"]["Tables"]["carts"]["Row"];
export type CartLineRow = Database["public"]["Tables"]["cart_lines"]["Row"];

export type CartLineWithVariant = CartLineRow & {
  variant: (ProductVariantRow & { product: (ProductRow & { images?: ProductImageRow[] }) | null }) | null;
};

export type CartWithLines = CartRow & {
  items: CartLineWithVariant[];
};

/**
 * Finds a cart by ID.
 * Governed by RLS policy: "Allow users to select own carts" on `carts`.
 */
export async function findCartById(id: string): Promise<CartWithLines | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("carts")
    .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*, images:product_images(*))))")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as CartWithLines;
}

/**
 * Finds the latest active cart for a given customer ID.
 * Governed by RLS policy: "Allow users to select own carts" on `carts`.
 */
export async function findCartByCustomerId(customerId: string): Promise<CartWithLines | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("carts")
    .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*, images:product_images(*))))")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as CartWithLines;
}

/**
 * Creates a new active cart.
 * If customerId is provided, attaches customer_id.
 * Otherwise, populates cart_token_hash from the server-managed guest cart_token cookie.
 * Governed by RLS policy: "Allow users to insert own carts" on `carts`.
 */
export async function createCart(customerId?: string): Promise<CartRow> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  let cartTokenHash: string | null = null;
  if (!customerId) {
    cartTokenHash = await getCartTokenHash();
  }

  const { data, error } = await supabase
    .from("carts")
    .insert({
      customer_id: customerId ?? null,
      cart_token_hash: cartTokenHash,
      status: "active",
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to create cart");
  return data;
}

/**
 * Adds an item to a cart or increments quantity if item already exists.
 * Price snapshot is calculated server-side from product_variants / products.
 * Governed by RLS policy: "Allow users to manage own cart lines" on `cart_lines`.
 */
export async function addCartItem(params: {
  cartId: string;
  variantId: string;
  quantity: number;
  unitPriceSnapshot?: number;
}): Promise<CartLineRow> {
  const supabase = await createClient();

  // Fetch authoritative unit price from product variant / product
  const { data: rawVariant, error: varErr } = await supabase
    .from("product_variants")
    .select("price_override, product:products(base_price)")
    .eq("id", params.variantId)
    .single();

  if (varErr || !rawVariant) {
    throw new NotFoundError("ProductVariant", params.variantId);
  }

  const variant = rawVariant as unknown as {
    price_override: number | null;
    product: { base_price: number } | null;
  };

  const basePrice = variant.product?.base_price ?? 0;
  const unitPrice = variant.price_override ?? basePrice ?? params.unitPriceSnapshot ?? 0;

  // Check if item already exists in cart
  const { data: existing } = await supabase
    .from("cart_lines")
    .select("*")
    .eq("cart_id", params.cartId)
    .eq("variant_id", params.variantId)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("cart_lines")
      .update({ quantity: existing.quantity + params.quantity, unit_price_snapshot: unitPrice })
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
      unit_price_snapshot: unitPrice,
    })
    .select()
    .single();

  if (error || !inserted) throw error || new Error("Failed to insert cart line");
  return inserted;
}

/**
 * Updates quantity of a cart line item.
 * Governed by RLS policy: "Allow users to manage own cart lines" on `cart_lines`.
 */
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

/**
 * Removes a cart line item.
 * Governed by RLS policy: "Allow users to manage own cart lines" on `cart_lines`.
 */
export async function removeCartItem(cartLineId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cart_lines")
    .delete()
    .eq("id", cartLineId);

  if (error) throw error;
  return { success: true };
}

/**
 * Clears all items from a cart.
 * Governed by RLS policy: "Allow users to manage own cart lines" on `cart_lines`.
 */
export async function clearCart(cartId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cart_lines")
    .delete()
    .eq("cart_id", cartId);

  if (error) throw error;
  return { success: true };
}
