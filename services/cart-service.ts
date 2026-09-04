import "server-only";
import * as cartRepo from "@/lib/db/carts";
import type { CartLineWithVariant, CartWithLines } from "@/lib/db/carts";
import * as inventoryService from "./inventory-service";
import { hashCartToken } from "@/lib/auth/cart-token";
import { NotFoundError } from "@/lib/errors";

export interface EnrichedCartLine extends CartLineWithVariant {
  is_stale?: boolean;
  stale_reason?: string;
}

export interface EnrichedCart extends Omit<CartWithLines, "items"> {
  items: EnrichedCartLine[];
  subtotal: number;
  itemCount: number;
  hasStaleItems: boolean;
}

function enrichCart(cart: CartWithLines): EnrichedCart {
  const rawItems: CartLineWithVariant[] = cart.items || [];
  let hasStaleItems = false;

  const items: EnrichedCartLine[] = rawItems.map((item) => {
    const v = item.variant;
    const p = v?.product;

    let is_stale = false;
    let stale_reason: string | undefined;

    if (!v) {
      is_stale = true;
      stale_reason = "Variant no longer exists";
    } else if (v.status !== "active" || v.archived_at !== null) {
      is_stale = true;
      stale_reason = "Variant is no longer active or has been archived";
    } else if (!p || p.status !== "published" || p.archived_at !== null) {
      is_stale = true;
      stale_reason = "Product is no longer published or has been archived";
    }

    if (is_stale) {
      hasStaleItems = true;
    }

    return {
      ...item,
      is_stale,
      stale_reason,
    };
  });

  const subtotal = items.reduce((acc, item) => {
    // unit_price_snapshot is stored in minor units (cents/kobo)
    const price = item.unit_price_snapshot ?? 0;
    return acc + (Number(price) / 100) * item.quantity;
  }, 0);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  return { ...cart, items, subtotal, itemCount, hasStaleItems };
}

/**
 * Fetches a cart by DB ID and computes the server-authoritative subtotal.
 * Used only for authenticated customer carts where the server holds the ID.
 */
export async function getCart(cartId: string, options?: cartRepo.CartQueryOptions): Promise<EnrichedCart> {
  const cart = await cartRepo.findCartById(cartId, options?.tokenHash, { useAdmin: options?.useAdmin });
  if (!cart) {
    throw new NotFoundError("Cart", cartId);
  }
  return enrichCart(cart);
}

/**
 * Resolves a guest cart by the opaque cart_token from the browser cookie.
 * The token is hashed server-side before the DB lookup — the browser never
 * supplies or knows the raw cart ID or hash.
 */
export async function getCartByToken(cartToken: string): Promise<EnrichedCart | null> {
  const tokenHash = hashCartToken(cartToken);
  const cart = await cartRepo.findCartByTokenHash(tokenHash);
  if (!cart) return null;
  return enrichCart(cart);
}

export async function createCart(customerId?: string, options?: cartRepo.CartQueryOptions) {
  return cartRepo.createCart(customerId, options);
}


/**
 * Adds a variant to the cart. The unit price is always resolved server-side
 * from the database (product_variants → products). Callers must NOT pass a
 * client-supplied price; the repo layer ignores any caller-provided value.
 */
export async function addItemToCart(
  params: {
    cartId?: string;
    variantId: string;
    quantity: number;
    customerId?: string;
  },
  options?: cartRepo.CartQueryOptions
) {
  let activeCartId = params.cartId;
  if (!activeCartId) {
    const newCart = await cartRepo.createCart(params.customerId);
    activeCartId = newCart.id;
  }

  // Verify stock before adding
  await inventoryService.verifyStockAvailability(params.variantId, params.quantity);

  const item = await cartRepo.addCartItem(
    {
      cartId: activeCartId,
      variantId: params.variantId,
      quantity: params.quantity,
      // unitPriceSnapshot intentionally omitted: repo fetches authoritative price from DB
    },
    options
  );

  const updatedCart = await getCart(activeCartId, options);
  return { cart: updatedCart, item };
}

export async function updateItemQuantity(
  cartLineId: string,
  quantity: number,
  options?: cartRepo.CartQueryOptions
) {
  return cartRepo.updateCartItemQuantity(cartLineId, quantity, options);
}

export async function removeItemFromCart(
  cartLineId: string,
  options?: cartRepo.CartQueryOptions
) {
  return cartRepo.removeCartItem(cartLineId, options);
}

/**
 * Merges a guest cart into the customer's authenticated cart on login.
 *
 * Strategy:
 *  1. Look up the customer's existing cart (if any).
 *  2. If the guest cart has items, copy them line-by-line into the customer cart,
 *     merging quantities for duplicate variants.
 *  3. Clear and discard the guest cart.
 *
 * Price snapshots are re-fetched server-side for each item during addCartItem.
 */
export async function mergeGuestCartOnLogin(
  params: {
    guestCartId: string;
    customerId: string;
  },
  options?: cartRepo.CartQueryOptions
): Promise<EnrichedCart> {
  const guestCart = await cartRepo.findCartById(params.guestCartId, options?.tokenHash, { useAdmin: options?.useAdmin });

  // Find or create a customer-owned cart
  let customerCartId: string;
  const existingCustomerCart = await cartRepo.findCartByCustomerId(params.customerId, options);
  if (existingCustomerCart) {
    customerCartId = existingCustomerCart.id;
  } else {
    const newCart = await cartRepo.createCart(params.customerId, options);
    customerCartId = newCart.id;
  }

  if (guestCart && guestCart.items.length > 0) {
    for (const line of guestCart.items) {
      if (!line.variant_id) continue;

      try {
        await cartRepo.addCartItem(
          {
            cartId: customerCartId,
            variantId: line.variant_id,
            quantity: line.quantity,
          },
          options
        );
      } catch {
        // Skip lines that are out of stock or no longer available
      }
    }

    // Discard the guest cart lines
    await cartRepo.clearCart(guestCart.id, options);
  }

  return getCart(customerCartId, options);
}
