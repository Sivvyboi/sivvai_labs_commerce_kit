import { paymentService } from "@/services";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const POST = withErrorHandler(async (req: Request) => {
  const signature = req.headers.get("verif-hash") || "";
  const payload = await req.json();

  const result = await paymentService.processWebhook("flutterwave", payload, signature);
  return jsonSuccess(result);
});
