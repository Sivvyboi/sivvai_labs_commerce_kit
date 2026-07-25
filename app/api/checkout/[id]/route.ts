import { checkoutService } from "@/services";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const GET = withErrorHandler(async (_req: Request, context?: { params: Promise<{ id: string }> }) => {
  const params = await context?.params;
  const id = params?.id || "";
  const session = await checkoutService.getCheckoutSession(id);
  return jsonSuccess(session);
});
