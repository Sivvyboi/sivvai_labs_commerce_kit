import { checkoutService, paymentService } from "@/services";
import { InitiateCheckoutSchema } from "@/lib/validation";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const POST = withErrorHandler(async (req: Request) => {
  const body = await req.json();
  const parsed = InitiateCheckoutSchema.parse(body);

  // 1. Initiate checkout session & inventory reservation
  const checkoutResult = await checkoutService.initiateCheckout(parsed);

  // 2. Initiate payment session using the checkout session id
  const sessionId = checkoutResult.checkoutSession.id;
  const paymentResult = await paymentService.initiatePayment({
    checkoutSessionId: sessionId,
  });

  return jsonSuccess(
    {
      checkoutSession: checkoutResult.checkoutSession,
      computed: checkoutResult.computed,
      payment: paymentResult,
    },
    undefined,
    201
  );
});
