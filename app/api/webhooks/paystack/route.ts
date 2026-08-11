import { paymentService } from "@/services";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const POST = withErrorHandler(async (req: Request) => {
  const signature = req.headers.get("x-paystack-signature") || "";
  const rawBody = await req.text();
  const payload = JSON.parse(rawBody);

  const result = await paymentService.processWebhook("paystack", rawBody, payload, signature);
  return jsonSuccess(result);
});
