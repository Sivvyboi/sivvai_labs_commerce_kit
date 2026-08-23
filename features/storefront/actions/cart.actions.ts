"use server";

/**
 * features/storefront/actions/cart.actions.ts
 *
 * Server Actions for storefront shopping cart management.
 *
 * Security & Cookie Model:
 *  - Cookie name: `cart_token` (opaque random UUID — NEVER the DB cart.id)
 *  - On cart creation: generate fresh token → hash → store hash in carts.cart_token_hash
 *  - On cart resolution: read token from cookie → hash server-side → findCartByTokenHash()
 *  - The browser never knows the DB cart UUID or the hash.
 *  - httpOnly: true, secure in production, sameSite: lax, maxAge: 7 days
 *  - Unit prices are NEVER accepted from the client; always resolved server-side.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import * as cartService from "@/services/cart-service";
import * as promotionService from "@/services/promotion-service";
import * as cartRepo from "@/lib/db/carts";
import {
  CART_COOKIE_NAME,
  generateCartToken,
  hashCartToken,
} from "@/lib/auth/cart-token";
import type { EnrichedCart } from "@/services/cart-service";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Writes an opaque cart_token into the browser cookie.
 * The token value stored here is the raw UUID — not the hash, not the cart ID.
 */
async function setCartTokenCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * Reads the current cart_token from cookies and returns it, or null.
 */
async function readCartToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE_NAME)?.value ?? null;
}

/**
 * Creates a fresh guest cart with an opaque token.
 * The token is written to the cookie; the hash is stored in the DB.
 * Returns the enriched cart.
 */
async function createGuestCartWithToken(existingToken?: string | null): Promise<{ cart: EnrichedCart; token: string }> {
  const token = existingToken || generateCartToken();
  const tokenHash = hashCartToken(token);

  const newCartRow = await cartRepo.createCartWithHash(tokenHash);
  if (!existingToken) {
    await setCartTokenCookie(token);
  }

  const cart = await cartService.getCartByToken(token);
  if (!cart) {
    return { cart: await cartService.getCart(newCartRow.id), token };
  }
  return { cart, token };
}

/**
 * Reads active cart_token from cookie and resolves the cart via hash.
 * If cookie missing, invalid, or cart expired, creates a new guest cart.
 */
export async function getOrCreateCartAction(): Promise<{
  success: boolean;
  cart: EnrichedCart;
}> {
  const token = await readCartToken();

  if (token) {
    const cart = await cartService.getCartByToken(token);
    if (cart) return { success: true, cart };
    // Token present but cart not found (expired/deleted) — create with this token
  }

  const { cart } = await createGuestCartWithToken(token);
  return { success: true, cart };
}

/**
 * Adds an item (variant) to the active cart.
 * Creates cart if not yet created.
 *
 * Note: `unitPriceSnapshot` is intentionally absent. Price is resolved server-side.
 */
export async function addToCartAction(params: {
  variantId: string;
  quantity?: number;
}): Promise<{
  success: boolean;
  cart: EnrichedCart;
  error?: string;
}> {
  try {
    const token = await readCartToken();
    let cartId: string;

    if (token) {
      const existingCart = await cartService.getCartByToken(token);
      if (existingCart) {
        cartId = existingCart.id;
      } else {
        // Token exists but cart is gone — create fresh with existing token
        const { cart: newCart } = await createGuestCartWithToken(token);
        cartId = newCart.id;
      }
    } else {
      const { cart: newCart } = await createGuestCartWithToken();
      cartId = newCart.id;
    }

    const { cart } = await cartService.addItemToCart({
      cartId,
      variantId: params.variantId,
      quantity: params.quantity ?? 1,
    });

    revalidatePath("/", "layout");
    return { success: true, cart };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add item to cart";

    // Return current cart state on failure
    const token = await readCartToken();
    let fallbackCart: EnrichedCart | null = token
      ? await cartService.getCartByToken(token)
      : null;

    if (!fallbackCart) {
      const { cart } = await createGuestCartWithToken();
      fallbackCart = cart;
    }

    return { success: false, cart: fallbackCart, error: message };
  }
}

/**
 * Updates quantity for a specific cart line item.
 */
export async function updateQuantityAction(params: {
  cartLineId: string;
  quantity: number;
}): Promise<{
  success: boolean;
  cart: EnrichedCart;
  error?: string;
}> {
  try {
    await cartService.updateItemQuantity(params.cartLineId, params.quantity);
    const { cart } = await getOrCreateCartAction();
    revalidatePath("/", "layout");
    return { success: true, cart };
  } catch (err) {
    const { cart } = await getOrCreateCartAction();
    return {
      success: false,
      cart,
      error: err instanceof Error ? err.message : "Failed to update quantity",
    };
  }
}

/**
 * Removes an item from the cart.
 */
export async function removeFromCartAction(cartLineId: string): Promise<{
  success: boolean;
  cart: EnrichedCart;
  error?: string;
}> {
  try {
    await cartService.removeItemFromCart(cartLineId);
    const { cart } = await getOrCreateCartAction();
    revalidatePath("/", "layout");
    return { success: true, cart };
  } catch (err) {
    const { cart } = await getOrCreateCartAction();
    return {
      success: false,
      cart,
      error: err instanceof Error ? err.message : "Failed to remove item",
    };
  }
}

/**
 * Clears all items from the current cart.
 */
export async function clearCartAction(): Promise<{
  success: boolean;
  cart: EnrichedCart;
  error?: string;
}> {
  try {
    const token = await readCartToken();
    if (token) {
      const existingCart = await cartService.getCartByToken(token);
      if (existingCart) {
        await cartRepo.clearCart(existingCart.id);
      }
    }

    const { cart } = await getOrCreateCartAction();
    revalidatePath("/", "layout");
    return { success: true, cart };
  } catch (err) {
    const { cart } = await getOrCreateCartAction();
    return {
      success: false,
      cart,
      error: err instanceof Error ? err.message : "Failed to clear cart",
    };
  }
}

/**
 * Merges the current guest cart into the authenticated customer's cart.
 * Call this immediately after a successful sign-in.
 *
 * The guest cart_token cookie is replaced with a new token pointing at the
 * merged customer cart. The browser still sees only an opaque token.
 */
export async function mergeCartOnLoginAction(customerId: string): Promise<{
  success: boolean;
  cart: EnrichedCart;
  error?: string;
}> {
  try {
    const token = await readCartToken();

    // Resolve guest cart ID by token (never trust cookie value as raw ID)
    let guestCartId: string | undefined;
    if (token) {
      const guestCart = await cartService.getCartByToken(token);
      if (guestCart) guestCartId = guestCart.id;
    }

    const mergedCart = await cartService.mergeGuestCartOnLogin({
      guestCartId: guestCartId ?? "",
      customerId,
    });

    // Issue a new opaque token pointing at the merged customer cart.
    // The hash of this new token is stored on the cart row.
    const newToken = generateCartToken();
    const newHash = hashCartToken(newToken);
    await cartRepo.updateCartTokenHash(mergedCart.id, newHash);
    await setCartTokenCookie(newToken);

    revalidatePath("/", "layout");
    return { success: true, cart: mergedCart };
  } catch (err) {
    const { cart } = await getOrCreateCartAction();
    return {
      success: false,
      cart,
      error: err instanceof Error ? err.message : "Cart merge failed",
    };
  }
}

/**
 * Validates and applies a promotion code to the current cart subtotal.
 */
export async function applyCouponAction(promoCode: string): Promise<{
  success: boolean;
  discountAmount: number;
  error?: string;
}> {
  try {
    const { cart } = await getOrCreateCartAction();
    const result = await promotionService.validateAndApplyPromoCode(
      promoCode,
      cart.subtotal
    );

    return {
      success: true,
      discountAmount: result.discountAmount,
    };
  } catch (err) {
    return {
      success: false,
      discountAmount: 0,
      error: err instanceof Error ? err.message : "Invalid promotion code",
    };
  }
}
