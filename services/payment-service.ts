import * as paymentRepo from "@/lib/db/payments";
import * as checkoutRepo from "@/lib/db/checkout";
import * as storeRepo from "@/lib/db/store";
import * as orderService from "./order-service";
import { getPaymentProvider } from "@/lib/payments";
import {
  NotFoundError,
  PaymentFailedError,
  PaymentVerificationError,
} from "@/lib/errors";
import type { Json } from "@/types";

export async function initiatePayment(params: {
  checkoutSessionId: string;
  providerName?: string;
  callbackUrl?: string;
}) {
  // 1. Fetch checkout session
  const session = await checkoutRepo.findCheckoutSessionById(params.checkoutSessionId);
  if (!session) {
    throw new NotFoundError("CheckoutSession", params.checkoutSessionId);
  }

  // 2. Resolve active provider
  let providerKey = params.providerName;
  if (!providerKey) {
    const storeSettings = await storeRepo.getStoreSettings();
    providerKey = storeSettings?.active_payment_provider ?? "paystack";
  }

  const provider = getPaymentProvider(providerKey);

  // 3. Generate a unique idempotency key & external reference
  const idempotencyKey = `${params.checkoutSessionId}-${Date.now()}`;
  const reference = `REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // 4. Initialize transaction via provider abstraction
  const initResult = await provider.initializePayment({
    amount: 0,
    currency: "NGN",
    email: "customer@store.com",
    reference,
    callbackUrl: params.callbackUrl,
    metadata: { checkoutSessionId: session.id },
  });

  // 5. Record payment attempt
  const attempt = await paymentRepo.createPaymentAttempt({
    order_id: null,
    attempt_number: 1,
    provider: provider.name,
    idempotency_key: idempotencyKey,
    provider_reference: reference,
    amount: 0,
    currency: "NGN",
    status: "pending",
    confirmed_at: null,
    metadata: JSON.parse(JSON.stringify(initResult)) as Json,
  });

  return {
    paymentAttempt: attempt,
    authorizationUrl: initResult.authorizationUrl,
    reference,
  };
}

export async function processWebhook(
  providerName: string,
  rawPayload: string,
  payload: Record<string, unknown>,
  signature: string
) {
  const provider = getPaymentProvider(providerName);

  // 1. Verify signature using raw body payload string
  if (!provider.verifyWebhookSignature(rawPayload, signature)) {
    throw new PaymentVerificationError("WEBHOOK", "Invalid webhook signature");
  }

  // 2. Extract reference
  const data = payload.data as Record<string, unknown> | undefined;
  const reference =
    (payload.reference as string) ||
    (data?.reference as string) ||
    (data?.tx_ref as string);

  if (!reference) {
    throw new PaymentFailedError("Webhook payload missing reference identifier");
  }

  // 3. Verify payment status directly with provider API
  const verification = await provider.verifyPayment(reference);
  const attempt = await paymentRepo.findPaymentAttemptByReference(reference);

  if (!attempt) {
    throw new NotFoundError("PaymentAttempt", reference);
  }

  if (verification.status === "success") {
    // Determine checkout session from attempt metadata
    const meta = attempt.metadata as Record<string, unknown> | null;
    const checkoutSessionId =
      (meta?.checkoutSessionId as string) ?? "";

    // Create order from checkout
    const order = await orderService.createOrderFromCheckout(
      checkoutSessionId,
      reference
    );

    // Update attempt with resolved order_id and status
    await paymentRepo.updatePaymentAttempt(attempt.id, {
      order_id: order.id,
      status: "confirmed",
      provider_reference: reference,
      confirmed_at: new Date().toISOString(),
      metadata: JSON.parse(JSON.stringify(verification)) as Json,
    });

    return { status: "processed", orderId: order.id };
  } else {
    await paymentRepo.updatePaymentAttempt(attempt.id, {
      status: "failed",
      metadata: JSON.parse(JSON.stringify(verification)) as Json,
    });
    return { status: "failed" };
  }
}
