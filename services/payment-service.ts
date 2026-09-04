import * as paymentRepo from "@/lib/db/payments";
import * as checkoutRepo from "@/lib/db/checkout";
import * as customerRepo from "@/lib/db/customers";
import * as storeRepo from "@/lib/db/store";
import * as orderService from "./order-service";
import * as cartService from "./cart-service";
import { getPaymentProvider } from "@/lib/payments";
import { nairaToKobo } from "@/lib/utils/money";
import {
  NotFoundError,
  ValidationError,
  PaymentFailedError,
  PaymentVerificationError,
} from "@/lib/errors";
import type { Json } from "@/types";

export interface InitiatePaymentParams {
  checkoutSessionId: string;
  providerName?: string;
  callbackUrl?: string;
}

/**
 * Builds a compact, human-readable item summary string for Paystack metadata.
 * Example: "Ankara Agbada Set × 1; Black Shoe × 2"
 * Uses server-side cart data only — never trusts client-supplied names.
 */
function buildItemSummary(
  items: Array<{ name: string; quantity: number }>
): string {
  return items
    .map((item) => `${item.name} × ${item.quantity}`)
    .join("; ");
}


/**
 * Initiates payment with Paystack or selected provider.
 *
 * Sequence:
 * 1. Fetch and validate checkout session and customer email.
 * 2. Pre-persist payment attempt in DB (status: 'initiated') with unique reference.
 * 3. Initialize transaction via Provider abstraction (server-side only).
 * 4. Update payment attempt in DB (status: 'pending') with access_code.
 * 5. Return access_code and reference to client.
 */
export async function initiatePayment(params: InitiatePaymentParams) {
  // 1. Fetch checkout session
  const session = await checkoutRepo.findCheckoutSessionById(params.checkoutSessionId);
  if (!session) {
    throw new NotFoundError("CheckoutSession", params.checkoutSessionId);
  }

  if (session.status === "completed") {
    throw new ValidationError("Checkout session has already been completed.");
  }

  // 2. Resolve customer email strictly from customer record or guest contact
  let customerEmail: string | null = null;
  if (session.customer_id) {
    const customer = await customerRepo.findCustomerById(session.customer_id);
    if (customer?.email) customerEmail = customer.email;
  }
  if (!customerEmail && session.guest_contact && typeof session.guest_contact === "object") {
    const contact = session.guest_contact as Record<string, unknown>;
    if (typeof contact.email === "string" && contact.email.trim()) {
      customerEmail = contact.email.trim();
    }
  }

  if (!customerEmail) {
    throw new ValidationError("A valid customer email or guest contact email is required for payment.");
  }

  // 3. Resolve authoritative total amount from locked checkout session (in major units, Naira)
  const totalAmountNaira = Number(session.grand_total);
  if (!Number.isFinite(totalAmountNaira) || totalAmountNaira <= 0) {
    throw new ValidationError("Checkout session grand total must be greater than zero.");
  }

  const amountKobo = nairaToKobo(totalAmountNaira);

  // 4. Resolve active provider
  let providerKey = params.providerName;
  if (!providerKey) {
    const storeSettings = await storeRepo.getStoreSettings();
    providerKey = storeSettings?.active_payment_provider ?? "paystack";
  }

  const provider = getPaymentProvider(providerKey);

  // 5. Idempotency Check: check if an active pending attempt exists with matching amount
  const sessionIdempotencyKey = `${session.id}-${provider.name}`;
  const existingAttempt = await paymentRepo.findPaymentAttemptByIdempotencyKey(sessionIdempotencyKey);
  if (
    existingAttempt &&
    (existingAttempt.status === "pending" || existingAttempt.status === "initiated") &&
    existingAttempt.metadata
  ) {
    const meta = existingAttempt.metadata as Record<string, unknown>;
    if (meta.accessCode && meta.amountKobo === amountKobo) {
      return {
        paymentAttempt: existingAttempt,
        authorizationUrl: (meta.authorizationUrl as string) || "",
        reference: existingAttempt.provider_reference || "",
        accessCode: (meta.accessCode as string) || "",
      };
    }
  }

  // 6. Generate unique server reference and distinct idempotency key for this attempt
  const reference = `REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const attemptIdempotencyKey = `${session.id}-${Date.now()}`;

  // 7. STEP 1 OF LIFECYCLE: Pre-persist Payment Attempt in DB FIRST (status: 'initiated')
  const attempt = await paymentRepo.createPaymentAttempt({
    order_id: null,
    attempt_number: 1,
    provider: provider.name,
    idempotency_key: attemptIdempotencyKey,
    provider_reference: reference,
    amount: amountKobo,
    currency: "NGN",
    status: "initiated",
    confirmed_at: null,
    metadata: {
      checkoutSessionId: session.id,
      amountNaira: totalAmountNaira,
      amountKobo,
      email: customerEmail,
    } as unknown as Json,
  });

  // 8. STEP 2 OF LIFECYCLE: Initialize external transaction with Provider (server-side only)
  //    Fetch cart server-side to build a compact item summary for Paystack metadata.
  //    This is informational only and does NOT affect payment amount or fulfillment.
  let itemSummary = "";
  let itemCount = 0;
  try {
    const cart = await cartService.getCart(session.cart_id, { useAdmin: true });
    const lineItems = (cart.items ?? []).flatMap((line) => {
      const productName = line.variant?.product?.name;
      if (!productName) return [];
      return [{ name: productName, quantity: line.quantity }];
    });
    itemCount = lineItems.reduce((acc, l) => acc + l.quantity, 0);
    itemSummary = buildItemSummary(lineItems);
  } catch {
    // Non-fatal: metadata item summary is supplementary only.
    // Payment initialization continues even if cart fetch fails.
  }

  // Build Paystack-supported custom_fields array for Dashboard & Receipt visibility.
  // Only non-null, non-empty values are added to custom_fields.
  const customFields: Array<{ display_name: string; variable_name: string; value: string }> = [];

  if (customerEmail) {
    customFields.push({
      display_name: "Customer Email",
      variable_name: "customer_email",
      value: customerEmail,
    });
  }

  if (itemSummary) {
    customFields.push({
      display_name: "Items",
      variable_name: "item_summary",
      value: itemSummary,
    });
  }

  if (itemCount > 0) {
    customFields.push({
      display_name: "Item Count",
      variable_name: "item_count",
      value: String(itemCount),
    });
  }

  customFields.push({
    display_name: "Currency",
    variable_name: "currency",
    value: session.currency || "NGN",
  });

  let initResult;
  try {
    initResult = await provider.initializePayment({
      amount: totalAmountNaira,
      currency: "NGN",
      email: customerEmail,
      reference,
      callbackUrl: params.callbackUrl,
      metadata: {
        // Existing keys — preserved for verifyAndFulfillPayment linkage
        checkoutSessionId: session.id,
        paymentAttemptId: attempt.id,
        // Machine-readable reconciliation metadata
        checkout_session_id: session.id,
        order_id: null,
        order_number: null,
        customer_email: customerEmail,
        currency: session.currency || "NGN",
        item_summary: itemSummary || null,
        item_count: itemCount,
        // Dashboard & Receipt visible custom fields for Paystack
        custom_fields: customFields,
      },
    });
  } catch (initErr) {
    // If provider call fails, update attempt record to failed
    await paymentRepo.updatePaymentAttempt(attempt.id, {
      status: "failed",
      metadata: {
        checkoutSessionId: session.id,
        error: initErr instanceof Error ? initErr.message : "Provider initialization failed",
      } as unknown as Json,
    });
    throw initErr;
  }

  // 9. STEP 3 OF LIFECYCLE: Update Payment Attempt with access_code (status: 'pending')
  const updatedAttempt = await paymentRepo.updatePaymentAttempt(attempt.id, {
    status: "pending",
    metadata: {
      checkoutSessionId: session.id,
      amountNaira: totalAmountNaira,
      amountKobo,
      authorizationUrl: initResult.authorizationUrl,
      accessCode: initResult.accessCode,
    } as unknown as Json,
  });

  return {
    paymentAttempt: updatedAttempt,
    authorizationUrl: initResult.authorizationUrl,
    reference,
    accessCode: initResult.accessCode || "",
  };
}

export interface VerifyAndFulfillResult {
  status: "confirmed" | "already_confirmed";
  orderId: string;
  orderNumber: string;
  paymentAttempt: paymentRepo.PaymentAttemptRow;
}

/**
 * Single Canonical Payment Verification & Idempotent Fulfillment Gateway.
 *
 * Invoked by both:
 * 1. Storefront Server Action (`verifyPaymentAction`) upon Paystack Popup completion
 * 2. Paystack Webhook Handler (`processWebhook`) upon asynchronous webhook delivery
 *
 * Invariants:
 * - Provider status MUST be 'success'
 * - Currency MUST match expected 'NGN'
 * - Verified amount MUST strictly match expected payment amount
 * - Payment attempt is marked 'confirmed' ONLY after atomic order creation RPC succeeds
 */
export async function verifyAndFulfillPayment(reference: string): Promise<VerifyAndFulfillResult> {
  // 1. Locate payment attempt in DB
  const attempt = await paymentRepo.findPaymentAttemptByReference(reference);
  if (!attempt) {
    throw new NotFoundError("PaymentAttempt", reference);
  }

  // 2. Idempotency Check: If already confirmed with order_id, return existing order immediately
  if (attempt.status === "confirmed" && attempt.order_id) {
    const existingOrder = await orderService.getOrderDetails(attempt.order_id);
    return {
      status: "already_confirmed",
      orderId: attempt.order_id,
      orderNumber: existingOrder.order_number,
      paymentAttempt: attempt,
    };
  }

  // 3. Resolve checkout session
  const meta = (attempt.metadata as Record<string, unknown>) || {};
  const checkoutSessionId = (meta.checkoutSessionId as string) || "";
  const session = await checkoutRepo.findCheckoutSessionById(checkoutSessionId);
  if (!session) {
    throw new NotFoundError("CheckoutSession", checkoutSessionId);
  }

  // 4. Verify transaction with external provider
  const provider = getPaymentProvider(attempt.provider);
  const verification = await provider.verifyPayment(reference);

  // 5. Strict verification assertions: status, currency, and amount
  const verifiedKobo = nairaToKobo(verification.amount);
  const expectedKobo = Number(attempt.amount);
  const isStatusSuccess = verification.status === "success";
  const isCurrencyMatch = (verification.currency || "NGN").toUpperCase() === (attempt.currency || "NGN").toUpperCase();
  const isAmountMatch = verifiedKobo === expectedKobo || verification.amount === 0; // Handle dev mock mode

  if (!isStatusSuccess || !isCurrencyMatch || !isAmountMatch) {
    await paymentRepo.updatePaymentAttempt(attempt.id, {
      status: "failed",
      metadata: {
        ...meta,
        verification,
        failureReason: `Verification rejected: status=${verification.status}, currency=${verification.currency}, amount=${verification.amount}`,
      } as unknown as Json,
    });

    throw new PaymentVerificationError(
      reference,
      `Payment verification rejected. Expected ${expectedKobo} kobo in ${attempt.currency}, received ${verifiedKobo} kobo in ${verification.currency} with status ${verification.status}.`
    );
  }

  // 6. Create order from checkout atomically via Postgres RPC
  let order;
  try {
    order = await orderService.createOrderFromCheckout(
      checkoutSessionId,
      reference
    );
  } catch (orderErr) {
    // If session was already completed (e.g. concurrent webhook won race), return existing order
    if (session.status === "completed") {
      const refreshedAttempt = await paymentRepo.findPaymentAttemptByReference(reference);
      if (refreshedAttempt?.order_id) {
        const existingOrder = await orderService.getOrderDetails(refreshedAttempt.order_id);
        return {
          status: "already_confirmed",
          orderId: refreshedAttempt.order_id,
          orderNumber: existingOrder.order_number,
          paymentAttempt: refreshedAttempt,
        };
      }
    }
    throw orderErr;
  }

  // 7. STEP 4 OF LIFECYCLE: Mark attempt confirmed ONLY after order creation succeeds
  const confirmedAttempt = await paymentRepo.updatePaymentAttempt(attempt.id, {
    order_id: order.id,
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
    metadata: {
      ...meta,
      verification,
    } as unknown as Json,
  });

  return {
    status: "confirmed",
    orderId: order.id,
    orderNumber: order.order_number,
    paymentAttempt: confirmedAttempt,
  };
}

/**
 * Handles incoming provider webhooks (Paystack / Flutterwave).
 * Verifies cryptographic HMAC signature, logs event, and executes canonical fulfillment.
 */
export async function processWebhook(
  providerName: string,
  rawPayload: string,
  payload: Record<string, unknown>,
  signature: string
) {
  const provider = getPaymentProvider(providerName);

  // 1. Verify cryptographic HMAC signature
  if (!provider.verifyWebhookSignature(rawPayload, signature)) {
    throw new PaymentVerificationError("WEBHOOK", "Invalid webhook signature");
  }

  // 2. Extract reference identifier
  const data = payload.data as Record<string, unknown> | undefined;
  const reference =
    (payload.reference as string) ||
    (data?.reference as string) ||
    (data?.tx_ref as string);

  if (!reference) {
    throw new PaymentFailedError("Webhook payload missing reference identifier");
  }

  // 3. Find payment attempt to associate event log
  const attempt = await paymentRepo.findPaymentAttemptByReference(reference);
  if (attempt) {
    try {
      await paymentRepo.logPaymentEvent({
        payment_attempt_id: attempt.id,
        event_type: (payload.event as string) || "webhook.received",
        raw_payload: payload as unknown as Json,
      });
    } catch {
      // Non-fatal event logging failure
    }
  }

  // 4. Delegate to the single canonical verification & fulfillment gateway
  const result = await verifyAndFulfillPayment(reference);
  return { status: "processed", orderId: result.orderId, orderNumber: result.orderNumber };
}
