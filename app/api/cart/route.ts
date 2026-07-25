import { cartService } from "@/services";
import { AddToCartSchema } from "@/lib/validation";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const GET = withErrorHandler(async (req: Request) => {
  const url = new URL(req.url);
  const cartId = url.searchParams.get("cartId");
  if (!cartId) {
    const newCart = await cartService.createCart();
    return jsonSuccess(newCart);
  }
  const cart = await cartService.getCart(cartId);
  return jsonSuccess(cart);
});

export const POST = withErrorHandler(async (req: Request) => {
  const body = await req.json();
  const parsed = AddToCartSchema.parse(body);
  const result = await cartService.addItemToCart(parsed);
  return jsonSuccess(result, undefined, 201);
});
