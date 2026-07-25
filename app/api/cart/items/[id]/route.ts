import { cartService } from "@/services";
import { UpdateCartItemSchema } from "@/lib/validation";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const PATCH = withErrorHandler(async (req: Request, context?: { params: Promise<{ id: string }> }) => {
  const params = await context?.params;
  const itemId = params?.id || "";
  const body = await req.json();
  const parsed = UpdateCartItemSchema.parse(body);

  const updated = await cartService.updateItemQuantity(itemId, parsed.quantity);
  return jsonSuccess(updated);
});

export const DELETE = withErrorHandler(async (_req: Request, context?: { params: Promise<{ id: string }> }) => {
  const params = await context?.params;
  const itemId = params?.id || "";
  const result = await cartService.removeItemFromCart(itemId);
  return jsonSuccess(result);
});
