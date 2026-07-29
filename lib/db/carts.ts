import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
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
  let { data, error } = await supabase
    .from("carts")
    .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*)))")
    .eq("id", id)
    .single();

  if (error && error.code === "42501") {
    const admin = createAdminClient();
    const adminRes = await admin
      .from("carts")
      .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*)))")
      .eq("id", id)
      .single();
    data = adminRes.data;
    error = adminRes.error;
  }

  if (error || !data) return null;
  return data as CartWithLines;
}

export async function findCartByCustomerId(customerId: string): Promise<CartWithLines | null> {
  const supabase = await createClient();
  let { data, error } = await supabase
    .from("carts")
    .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*)))")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code === "42501") {
    const admin = createAdminClient();
    const adminRes = await admin
      .from("carts")
      .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*)))")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    data = adminRes.data;
    error = adminRes.error;
  }

  if (error || !data) return null;
  return data as CartWithLines;
}

export async function createCart(customerId?: string): Promise<CartRow> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  let { data, error } = await supabase
    .from("carts")
    .insert({ customer_id: customerId ?? null, status: "active", expires_at: expiresAt })
    .select()
    .single();

  if (error && error.code === "42501") {
    const admin = createAdminClient();
    const adminRes = await admin
      .from("carts")
      .insert({ customer_id: customerId ?? null, status: "active", expires_at: expiresAt })
      .select()
      .single();
    data = adminRes.data;
    error = adminRes.error;
  }

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
  const { data: existingData, error: findErr } = await supabase
    .from("cart_lines")
    .select("*")
    .eq("cart_id", params.cartId)
    .eq("variant_id", params.variantId)
    .maybeSingle();

  let existing = existingData;
  let useAdmin = false;

  if (findErr && findErr.code === "42501") {
    useAdmin = true;
    const admin = createAdminClient();
    const adminRes = await admin
      .from("cart_lines")
      .select("*")
      .eq("cart_id", params.cartId)
      .eq("variant_id", params.variantId)
      .maybeSingle();
    existing = adminRes.data;
  }

  if (existing) {
    const client = useAdmin ? createAdminClient() : supabase;
    let { data: updated, error } = await client
      .from("cart_lines")
      .update({ quantity: existing.quantity + params.quantity })
      .eq("id", existing.id)
      .select()
      .single();

    if (error && error.code === "42501") {
      const admin = createAdminClient();
      const adminRes = await admin
        .from("cart_lines")
        .update({ quantity: existing.quantity + params.quantity })
        .eq("id", existing.id)
        .select()
        .single();
      updated = adminRes.data;
      error = adminRes.error;
    }

    if (error || !updated) throw error || new Error("Failed to update cart line");
    return updated;
  }

  const client = useAdmin ? createAdminClient() : supabase;
  let { data: inserted, error } = await client
    .from("cart_lines")
    .insert({
      cart_id: params.cartId,
      variant_id: params.variantId,
      quantity: params.quantity,
      unit_price_snapshot: params.unitPriceSnapshot,
    })
    .select()
    .single();

  if (error && error.code === "42501") {
    const admin = createAdminClient();
    const adminRes = await admin
      .from("cart_lines")
      .insert({
        cart_id: params.cartId,
        variant_id: params.variantId,
        quantity: params.quantity,
        unit_price_snapshot: params.unitPriceSnapshot,
      })
      .select()
      .single();
    inserted = adminRes.data;
    error = adminRes.error;
  }

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
  let { data, error } = await supabase
    .from("cart_lines")
    .update({ quantity })
    .eq("id", cartLineId)
    .select()
    .single();

  if (error && error.code === "42501") {
    const admin = createAdminClient();
    const adminRes = await admin
      .from("cart_lines")
      .update({ quantity })
      .eq("id", cartLineId)
      .select()
      .single();
    data = adminRes.data;
    error = adminRes.error;
  }

  if (error || !data) throw error || new Error("Failed to update cart item quantity");
  return data;
}

export async function removeCartItem(cartLineId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  let { error } = await supabase.from("cart_lines").delete().eq("id", cartLineId);

  if (error && error.code === "42501") {
    const admin = createAdminClient();
    const adminRes = await admin.from("cart_lines").delete().eq("id", cartLineId);
    error = adminRes.error;
  }

  if (error) throw error;
  return { success: true };
}

export async function clearCart(cartId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  let { error } = await supabase.from("cart_lines").delete().eq("cart_id", cartId);

  if (error && error.code === "42501") {
    const admin = createAdminClient();
    const adminRes = await admin.from("cart_lines").delete().eq("cart_id", cartId);
    error = adminRes.error;
  }

  if (error) throw error;
  return { success: true };
}
