import { paymentService } from "@/services";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const POST = withErrorHandler(async (req: Request) => {
  const signature = req.headers.get("x-paystack-signature") || "";
  const payload = await req.json();

  const result = await paymentService.processWebhook("paystack", payload, signature);
  return jsonSuccess(result);
});
