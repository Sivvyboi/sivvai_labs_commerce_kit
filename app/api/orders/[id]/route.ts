import { orderService } from "@/services";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const GET = withErrorHandler(async (_req: Request, context?: { params: Promise<{ id: string }> }) => {
  const params = await context?.params;
  const id = params?.id || "";
  const order = await orderService.getOrderDetails(id);
  return jsonSuccess(order);
});
