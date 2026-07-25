import * as cartRepo from "@/lib/db/carts";
import type { CartLineWithVariant, CartWithLines } from "@/lib/db/carts";
import * as inventoryService from "./inventory-service";
import { NotFoundError } from "@/lib/errors";

export interface EnrichedCart extends CartWithLines {
  subtotal: number;
  itemCount: number;
}

export async function getCart(cartId: string): Promise<EnrichedCart> {
  const cart = await cartRepo.findCartById(cartId);
  if (!cart) {
    throw new NotFoundError("Cart", cartId);
  }

  const items: CartLineWithVariant[] = cart.items || [];
  const subtotal = items.reduce((acc, item) => {
    const price = item.variant?.price_override ?? item.variant?.product?.base_price ?? 0;
    return acc + Number(price) * item.quantity;
  }, 0);

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return {
    ...cart,
    subtotal,
    itemCount,
  };
}

export async function createCart(customerId?: string) {
  return cartRepo.createCart(customerId);
}

export async function addItemToCart(params: {
  cartId?: string;
  variantId: string;
  quantity: number;
  customerId?: string;
  unitPriceSnapshot?: number;
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
    unitPriceSnapshot: params.unitPriceSnapshot ?? 0,
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
