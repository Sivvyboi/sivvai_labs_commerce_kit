import "server-only";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { getCartTokenHash } from "../auth/cart-token";
import { NotFoundError, ValidationError, InsufficientStockError } from "../errors";
import { resolveVariantPrice } from "../variants/pricing";
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

export interface CartQueryOptions {
  tokenHash?: string;
  useAdmin?: boolean;
}

/**
 * Finds a cart by ID.
 * Governed by RLS policy: "Allow users to select own carts" on `carts`.
 */
export async function findCartById(
  id: string,
  tokenHash?: string,
  options?: { useAdmin?: boolean }
): Promise<CartWithLines | null> {
  const supabase = options?.useAdmin
    ? createAdminClient()
    : await createClient(tokenHash ? { cartTokenHash: tokenHash } : undefined);
  const { data, error } = await supabase
    .from("carts")
    .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*, images:product_images(*))))")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return (data as unknown) as CartWithLines;
}

/**
 * Finds the latest active cart for a given customer ID.
 * Governed by RLS policy: "Allow users to select own carts" on `carts`.
 */
export async function findCartByCustomerId(
  customerId: string,
  options?: CartQueryOptions
): Promise<CartWithLines | null> {
  const supabase = options?.useAdmin
    ? createAdminClient()
    : await createClient(options?.tokenHash ? { cartTokenHash: options.tokenHash } : undefined);
  const { data, error } = await supabase
    .from("carts")
    .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*, images:product_images(*))))")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return (data as unknown) as CartWithLines;
}

/**
 * Finds an active guest cart by its cart_token_hash.
 * The browser holds only the opaque cart_token; the server hashes it before lookup.
 * Governed by RLS policy using `cart_token_hash` column.
 */
export async function findCartByTokenHash(tokenHash: string): Promise<CartWithLines | null> {
  const supabase = await createClient({ cartTokenHash: tokenHash });
  const { data, error } = await supabase
    .from("carts")
    .select("*, items:cart_lines(*, variant:product_variants(*, product:products(*, images:product_images(*))))")
    .eq("cart_token_hash", tokenHash)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return (data as unknown) as CartWithLines;
}


/**
 * Creates a new active cart.
 * If customerId is provided, attaches customer_id.
 * Otherwise, populates cart_token_hash from the server-managed guest cart_token cookie.
 * Governed by RLS policy: "Allow users to insert own carts" on `carts`.
 */
export async function createCart(
  customerId?: string,
  options?: CartQueryOptions
): Promise<CartRow> {
  let cartTokenHash: string | null = options?.tokenHash ?? null;
  if (!customerId && !cartTokenHash) {
    cartTokenHash = await getCartTokenHash();
  }

  const supabase = options?.useAdmin
    ? createAdminClient()
    : await createClient(cartTokenHash ? { cartTokenHash } : undefined);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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
 * Creates a new guest cart with a caller-supplied token hash.
 * Used when the action layer generates the token before setting the cookie,
 * so the hash is known without needing a cookie read.
 */
export async function createCartWithHash(tokenHash: string): Promise<CartRow> {
  const supabase = await createClient({ cartTokenHash: tokenHash });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("carts")
    .insert({
      customer_id: null,
      cart_token_hash: tokenHash,
      status: "active",
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !data) throw error || new Error("Failed to create cart");
  return data;
}

/**
 * Updates the cart_token_hash on an existing cart.
 * Used after login merge to re-key the cart to a new opaque token.
 */
export async function updateCartTokenHash(cartId: string, tokenHash: string): Promise<void> {
  const supabase = await createClient({ cartTokenHash: tokenHash });
  const { error } = await supabase
    .from("carts")
    .update({ cart_token_hash: tokenHash })
    .eq("id", cartId);

  if (error) throw error;
}


/**
 * Adds an item to a cart or increments quantity if item already exists.
 * Price snapshot is calculated server-side from canonical variant/product pricing resolver.
 * Stock availability and active status are authoritatively verified at this DB boundary.
 * Governed by RLS policy: "Allow users to manage own cart lines" on `cart_lines`.
 */
export async function addCartItem(
  params: {
    cartId: string;
    variantId: string;
    quantity: number;
    unitPriceSnapshot?: number; // Ignored for security; server computes canonical price
  },
  options?: CartQueryOptions
): Promise<CartLineRow> {
  const supabase = options?.useAdmin
    ? createAdminClient()
    : await createClient(options?.tokenHash ? { cartTokenHash: options.tokenHash } : undefined);

  if (params.quantity <= 0) {
    throw new ValidationError("Quantity must be greater than zero");
  }

  // 1. Fetch variant with product and companion inventory record
  const { data: rawVariant, error: varErr } = await supabase
    .from("product_variants")
    .select(`
      id, product_id, sku, status, archived_at, price_override,
      product:products(id, name, status, archived_at, base_price, sale_price),
      inventory:inventory_records(id, on_hand_quantity, reserved_quantity, track_inventory, allow_backorders)
    `)
    .eq("id", params.variantId)
    .single();

  if (varErr || !rawVariant) {
    throw new NotFoundError("ProductVariant", params.variantId);
  }

  const variant = rawVariant as unknown as {
    id: string;
    product_id: string;
    sku: string | null;
    status: string;
    archived_at: string | null;
    price_override: number | null;
    product: {
      id: string;
      name: string;
      status: string;
      archived_at: string | null;
      base_price: number;
      sale_price: number | null;
    } | null;
    inventory: {
      id: string;
      on_hand_quantity: number;
      reserved_quantity: number;
      track_inventory: boolean;
      allow_backorders: boolean;
    } | Array<{
      id: string;
      on_hand_quantity: number;
      reserved_quantity: number;
      track_inventory: boolean;
      allow_backorders: boolean;
    }> | null;
  };

  // 2. Validate variant active and not archived
  if (variant.status !== "active" || variant.archived_at !== null) {
    throw new ValidationError(
      `Variant ${variant.sku || params.variantId} is no longer active or has been archived`
    );
  }

  // 3. Validate product published and not archived
  if (
    !variant.product ||
    variant.product.status !== "published" ||
    variant.product.archived_at !== null
  ) {
    throw new ValidationError("Product is no longer available");
  }

  // 4. Resolve canonical price (minor units / kobo)
  const unitPrice = resolveVariantPrice(variant.product, variant);

  // 5. Check existing item in cart
  const { data: existing } = await supabase
    .from("cart_lines")
    .select("*")
    .eq("cart_id", params.cartId)
    .eq("variant_id", params.variantId)
    .maybeSingle();

  const totalRequestedQuantity = (existing?.quantity ?? 0) + params.quantity;

  // 6. Authoritative inventory verification
  const inv = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
  if (!inv) {
    throw new InsufficientStockError(params.variantId, totalRequestedQuantity, 0);
  }

  if (inv.track_inventory && !inv.allow_backorders) {
    const availableStock = Math.max(0, (inv.on_hand_quantity ?? 0) - (inv.reserved_quantity ?? 0));
    if (availableStock < totalRequestedQuantity) {
      throw new InsufficientStockError(params.variantId, totalRequestedQuantity, availableStock);
    }
  }

  // 7. Update existing or insert new cart line
  if (existing) {
    const { data: updated, error } = await supabase
      .from("cart_lines")
      .update({
        quantity: totalRequestedQuantity,
        unit_price_snapshot: unitPrice,
      })
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
 * Authoritatively validates variant status, product status, and inventory limits.
 * Governed by RLS policy: "Allow users to manage own cart lines" on `cart_lines`.
 */
export async function updateCartItemQuantity(
  cartLineId: string,
  quantity: number,
  options?: CartQueryOptions
): Promise<CartLineRow | { success: boolean }> {
  if (quantity <= 0) {
    return removeCartItem(cartLineId, options);
  }

  const supabase = options?.useAdmin
    ? createAdminClient()
    : await createClient(options?.tokenHash ? { cartTokenHash: options.tokenHash } : undefined);

  // Fetch cart line with variant and inventory
  const { data: rawLine, error: lineErr } = await supabase
    .from("cart_lines")
    .select(`
      id, cart_id, variant_id,
      variant:product_variants(
        id, sku, status, archived_at, price_override,
        product:products(id, status, archived_at, base_price, sale_price),
        inventory:inventory_records(id, on_hand_quantity, reserved_quantity, track_inventory, allow_backorders)
      )
    `)
    .eq("id", cartLineId)
    .single();

  if (lineErr || !rawLine || !rawLine.variant) {
    throw new NotFoundError("CartLine", cartLineId);
  }

  const variant = rawLine.variant as unknown as {
    id: string;
    sku: string | null;
    status: string;
    archived_at: string | null;
    price_override: number | null;
    product: {
      id: string;
      status: string;
      archived_at: string | null;
      base_price: number;
      sale_price: number | null;
    } | null;
    inventory: {
      id: string;
      on_hand_quantity: number;
      reserved_quantity: number;
      track_inventory: boolean;
      allow_backorders: boolean;
    } | Array<{
      id: string;
      on_hand_quantity: number;
      reserved_quantity: number;
      track_inventory: boolean;
      allow_backorders: boolean;
    }> | null;
  };

  // Validate variant is active and not archived
  if (variant.status !== "active" || variant.archived_at !== null) {
    throw new ValidationError(
      `Variant ${variant.sku || rawLine.variant_id} is no longer active or has been archived`
    );
  }

  // Validate product is published and not archived
  if (
    !variant.product ||
    variant.product.status !== "published" ||
    variant.product.archived_at !== null
  ) {
    throw new ValidationError("Product is no longer available");
  }

  // Authoritative stock check
  const inv = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
  if (!inv) {
    throw new InsufficientStockError(rawLine.variant_id, quantity, 0);
  }

  if (inv.track_inventory && !inv.allow_backorders) {
    const availableStock = Math.max(0, (inv.on_hand_quantity ?? 0) - (inv.reserved_quantity ?? 0));
    if (availableStock < quantity) {
      throw new InsufficientStockError(rawLine.variant_id, quantity, availableStock);
    }
  }

  // Re-resolve canonical price on quantity update so snapshot is up-to-date
  const unitPrice = resolveVariantPrice(variant.product, variant);

  const { data, error } = await supabase
    .from("cart_lines")
    .update({ quantity, unit_price_snapshot: unitPrice })
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
export async function removeCartItem(
  cartLineId: string,
  options?: CartQueryOptions
): Promise<{ success: boolean }> {
  const supabase = options?.useAdmin
    ? createAdminClient()
    : await createClient(options?.tokenHash ? { cartTokenHash: options.tokenHash } : undefined);
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
export async function clearCart(
  cartId: string,
  options?: CartQueryOptions
): Promise<{ success: boolean }> {
  const supabase = options?.useAdmin
    ? createAdminClient()
    : await createClient(options?.tokenHash ? { cartTokenHash: options.tokenHash } : undefined);
  const { error } = await supabase
    .from("cart_lines")
    .delete()
    .eq("cart_id", cartId);

  if (error) throw error;
  return { success: true };
}
