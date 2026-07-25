"use server";

/**
 * features/storefront/actions/cart.actions.ts
 *
 * Server Actions for storefront shopping cart management.
 *
 * Security & Cookie Specs:
 *  - Cookie name: `cart_id`
 *  - httpOnly: true, secure in production, sameSite: lax, maxAge: 7 days
 *  - All mutations consume existing cart-service / promotion-service logic
 *  - Revalidates path cache after mutations
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import * as cartService from "@/services/cart-service";
import * as promotionService from "@/services/promotion-service";
import * as cartRepo from "@/lib/db/carts";
import type { EnrichedCart } from "@/services/cart-service";

const CART_COOKIE_NAME = "cart_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Helper to get cookie store and set the cart_id cookie securely.
 */
async function setCartCookie(cartId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE_NAME, cartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * Reads active cart_id from cookie, fetches cart from cartService.
 * If cookie missing or cart invalid/expired, creates a new cart and sets the cookie.
 */
export async function getOrCreateCartAction(): Promise<{
  success: boolean;
  cart: EnrichedCart;
}> {
  const cookieStore = await cookies();
  const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (existingCartId) {
    try {
      const cart = await cartService.getCart(existingCartId);
      return { success: true, cart };
    } catch {
      // Cart expired or not found in database — fall through to create a new one
    }
  }

  const newCartRecord = await cartService.createCart();
  await setCartCookie(newCartRecord.id);

  const cart = await cartService.getCart(newCartRecord.id);
  return { success: true, cart };
}

/**
 * Adds an item (variant) to the active cart.
 * Creates cart if not yet created.
 */
export async function addToCartAction(params: {
  variantId: string;
  quantity?: number;
  unitPriceSnapshot?: number;
}): Promise<{
  success: boolean;
  cart: EnrichedCart;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    let cartId = cookieStore.get(CART_COOKIE_NAME)?.value;

    if (!cartId) {
      const newCart = await cartService.createCart();
      cartId = newCart.id;
      await setCartCookie(cartId);
    }

    const { cart } = await cartService.addItemToCart({
      cartId,
      variantId: params.variantId,
      quantity: params.quantity ?? 1,
      unitPriceSnapshot: params.unitPriceSnapshot,
    });

    revalidatePath("/", "layout");
    return { success: true, cart };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add item to cart";
    // Fetch fallback cart if available
    const cookieStore = await cookies();
    const existingCartId = cookieStore.get(CART_COOKIE_NAME)?.value;
    let fallbackCart: EnrichedCart | null = null;
    if (existingCartId) {
      try {
        fallbackCart = await cartService.getCart(existingCartId);
      } catch {
        // ignore fallback error
      }
    }

    if (!fallbackCart) {
      const newCart = await cartService.createCart();
      await setCartCookie(newCart.id);
      fallbackCart = await cartService.getCart(newCart.id);
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
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_COOKIE_NAME)?.value;

    if (cartId) {
      await cartRepo.clearCart(cartId);
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
