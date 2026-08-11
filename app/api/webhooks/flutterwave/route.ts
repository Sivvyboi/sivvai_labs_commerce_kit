import { paymentService } from "@/services";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const POST = withErrorHandler(async (req: Request) => {
  const signature = req.headers.get("verif-hash") || "";
  const rawBody = await req.text();
  const payload = JSON.parse(rawBody);

  const result = await paymentService.processWebhook("flutterwave", rawBody, payload, signature);
  return jsonSuccess(result);
});
