/**
 * scripts/recover-successful-payment.ts
 *
 * Dedicated recovery script for the real Paystack test transaction: REF-1787735884953-2513
 *
 * Requirements:
 * 1. Inspect attempt before recovery (status: 'pending', order_id: null).
 * 2. Invoke paymentService.verifyAndFulfillPayment(reference).
 * 3. Verify order created, shipping snapshots are valid JSONB, attempt confirmed.
 * 4. Verify idempotency on second call (no duplicate order).
 * 5. Zero double-charges.
 */

import { paymentService } from "../services";
import { findPaymentAttemptByReference } from "../lib/db/payments";
import { findCheckoutSessionById } from "../lib/db/checkout";
import { createAdminClient } from "../lib/supabase/admin";

const REFERENCE = "REF-1787735884953-2513";

async function main() {
  console.log("==================================================================");
  console.log(`  Recovering Successful Paystack Transaction: ${REFERENCE}`);
  console.log("==================================================================\n");

  const supabase = createAdminClient();

  // 1. Inspect existing payment attempt
  console.log("[1] Checking existing payment attempt in database...");
  const attempt = await findPaymentAttemptByReference(REFERENCE);
  if (!attempt) {
    console.error(`❌ Payment attempt ${REFERENCE} not found in database.`);
    process.exit(1);
  }

  console.log(`    -> ID: ${attempt.id}`);
  console.log(`    -> Status: ${attempt.status}`);
  console.log(`    -> Order ID: ${attempt.order_id ?? "null"}`);
  console.log(`    -> Amount (kobo): ${attempt.amount}`);
  console.log(`    -> Provider: ${attempt.provider}`);

  const meta = (attempt.metadata as Record<string, unknown>) || {};
  const sessionId = (meta.checkoutSessionId as string) || "";
  console.log(`    -> Checkout Session ID: ${sessionId}`);

  if (sessionId) {
    const session = await findCheckoutSessionById(sessionId);
    console.log(`    -> Checkout Session Status: ${session?.status ?? "not found"}`);
    console.log(`    -> Session Grand Total: ${session?.grand_total ?? "null"}`);
    console.log(`    -> Session Shipping Total: ${session?.shipping_total ?? "null"}`);
    console.log(`    -> Session Fulfilment Method ID: ${session?.fulfilment_method_id ?? "null"}`);
  }

  // 2. Execute verifyAndFulfillPayment
  console.log("\n[2] Executing canonical verifyAndFulfillPayment()...");
  const result = await paymentService.verifyAndFulfillPayment(REFERENCE);
  console.log("    -> Result Status:", result.status);
  console.log("    -> Result Order ID:", result.orderId);
  console.log("    -> Result Order Number:", result.orderNumber);

  // 3. Inspect created order and verify snapshots
  console.log("\n[3] Verifying created order and shipping snapshots in database...");
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", result.orderId)
    .single();

  if (orderErr || !order) {
    console.error("❌ Failed to fetch created order from database:", orderErr);
    process.exit(1);
  }

  console.log(`    -> Order Number: ${order.order_number}`);
  console.log(`    -> Order Status: ${order.status}`);
  console.log(`    -> Subtotal: ${order.subtotal}`);
  console.log(`    -> Shipping Total: ${order.shipping_total}`);
  console.log(`    -> Grand Total: ${order.grand_total}`);
  console.log(`    -> Shipping Method Snapshot:`, JSON.stringify(order.shipping_method_snapshot));
  console.log(`    -> Shipping Rate Snapshot:`, JSON.stringify(order.shipping_rate_snapshot));

  if (!order.shipping_method_snapshot || typeof order.shipping_method_snapshot !== "object") {
    console.error("❌ shipping_method_snapshot is not a valid JSONB object!");
    process.exit(1);
  }

  if (!order.shipping_rate_snapshot || typeof order.shipping_rate_snapshot !== "object") {
    console.error("❌ shipping_rate_snapshot is not a valid JSONB object!");
    process.exit(1);
  }

  // 4. Verify payment attempt is now confirmed
  console.log("\n[4] Verifying payment attempt status update...");
  const updatedAttempt = await findPaymentAttemptByReference(REFERENCE);
  console.log(`    -> Attempt Status: ${updatedAttempt?.status}`);
  console.log(`    -> Linked Order ID: ${updatedAttempt?.order_id}`);

  if (updatedAttempt?.status !== "confirmed" || updatedAttempt?.order_id !== result.orderId) {
    console.error("❌ Payment attempt was not correctly confirmed with linked order ID!");
    process.exit(1);
  }

  // 5. Test idempotency
  console.log("\n[5] Testing idempotency on repeated verification call...");
  const idempotentResult = await paymentService.verifyAndFulfillPayment(REFERENCE);
  console.log("    -> Idempotent Status:", idempotentResult.status);
  console.log("    -> Idempotent Order ID:", idempotentResult.orderId);

  if (idempotentResult.orderId !== result.orderId) {
    console.error("❌ Idempotency failed: generated a different order ID!");
    process.exit(1);
  }

  console.log("\n==================================================================");
  console.log("  SUCCESSFULLY RECOVERED ORDER WITHOUT DUPLICATE CHARGES! ");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("❌ Recovery script failed with error:", err);
  process.exit(1);
});
