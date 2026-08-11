import "server-only";
import * as cartRepo from "@/lib/db/carts";
import type { CartLineWithVariant, CartWithLines } from "@/lib/db/carts";
import * as inventoryService from "./inventory-service";
import { NotFoundError } from "@/lib/errors";

export interface EnrichedCart extends CartWithLines {
  subtotal: number;
  itemCount: number;
}

/**
 * Fetches a cart by ID and computes the server-authoritative subtotal
 * using the stored unit_price_snapshot (set at the repo level from DB prices).
 */
export async function getCart(cartId: string): Promise<EnrichedCart> {
  const cart = await cartRepo.findCartById(cartId);
  if (!cart) {
    throw new NotFoundError("Cart", cartId);
  }

  const items: CartLineWithVariant[] = cart.items || [];
  const subtotal = items.reduce((acc, item) => {
    // unit_price_snapshot is stored in minor units (cents/kobo)
    const price = item.unit_price_snapshot ?? 0;
    return acc + (Number(price) / 100) * item.quantity;
  }, 0);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return { ...cart, subtotal, itemCount };
}

export async function createCart(customerId?: string) {
  return cartRepo.createCart(customerId);
}

/**
 * Adds a variant to the cart. The unit price is always resolved server-side
 * from the database (product_variants → products). Callers must NOT pass a
 * client-supplied price; the repo layer ignores any caller-provided value.
 */
export async function addItemToCart(params: {
  cartId?: string;
  variantId: string;
  quantity: number;
  customerId?: string;
}) {
  let activeCartId = params.cartId;
  if (!activeCartId) {
    const newCart = await cartRepo.createCart(params.customerId);
    activeCartId = newCart.id;
  }

  // Verify stock before adding
  await inventoryService.verifyStockAvailability(params.variantId, params.quantity);

  const item = await cartRepo.addCartItem({
    cartId: activeCartId,
    variantId: params.variantId,
    quantity: params.quantity,
    // unitPriceSnapshot intentionally omitted: repo fetches authoritative price from DB
  });

  const updatedCart = await getCart(activeCartId);
  return { cart: updatedCart, item };
}

export async function updateItemQuantity(cartLineId: string, quantity: number) {
  return cartRepo.updateCartItemQuantity(cartLineId, quantity);
}

export async function removeItemFromCart(cartLineId: string) {
  return cartRepo.removeCartItem(cartLineId);
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
export async function mergeGuestCartOnLogin(params: {
  guestCartId: string;
  customerId: string;
}): Promise<EnrichedCart> {
  const guestCart = await cartRepo.findCartById(params.guestCartId);

  // Find or create a customer-owned cart
  let customerCartId: string;
  const existingCustomerCart = await cartRepo.findCartByCustomerId(params.customerId);
  if (existingCustomerCart) {
    customerCartId = existingCustomerCart.id;
  } else {
    const newCart = await cartRepo.createCart(params.customerId);
    customerCartId = newCart.id;
  }

  if (guestCart && guestCart.items.length > 0) {
    for (const line of guestCart.items) {
      if (!line.variant_id) continue;

      try {
        await cartRepo.addCartItem({
          cartId: customerCartId,
          variantId: line.variant_id,
          quantity: line.quantity,
        });
      } catch {
        // Skip lines that are out of stock or no longer available
      }
    }

    // Discard the guest cart lines
    await cartRepo.clearCart(guestCart.id);
  }

  return getCart(customerCartId);
}
