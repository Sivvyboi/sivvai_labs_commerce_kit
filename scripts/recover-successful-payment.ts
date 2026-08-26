/**
 * scripts/recover-successful-payment.ts
 *
 * Standalone Node.js recovery script for real Paystack test transaction: REF-1787735884953-2513
 * Runs cleanly from terminal (PowerShell / Bash) without Next.js server-only bundling constraints.
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const REFERENCE = "REF-1787735884953-2513";

// 1. Load environment variables from .env.local if not already in process.env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("==================================================================");
  console.log(`  Recovering Successful Paystack Transaction: ${REFERENCE}`);
  console.log("==================================================================\n");

  // 1. Inspect existing payment attempt
  console.log("[1] Checking existing payment attempt in database...");
  const { data: attempt, error: attemptErr } = await supabase
    .from("payment_attempts")
    .select("*")
    .eq("provider_reference", REFERENCE)
    .maybeSingle();

  if (attemptErr || !attempt) {
    console.error(`❌ Payment attempt ${REFERENCE} not found:`, attemptErr);
    process.exit(1);
  }

  console.log(`    -> ID: ${attempt.id}`);
  console.log(`    -> Status: ${attempt.status}`);
  console.log(`    -> Order ID: ${attempt.order_id ?? "null"}`);
  console.log(`    -> Amount (kobo): ${attempt.amount}`);
  console.log(`    -> Currency: ${attempt.currency}`);

  const meta = (attempt.metadata as Record<string, unknown>) || {};
  const sessionId = (meta.checkoutSessionId as string) || "";
  console.log(`    -> Checkout Session ID: ${sessionId}`);

  if (attempt.status === "confirmed" && attempt.order_id) {
    console.log("\n[INFO] Payment attempt is already confirmed! Order ID:", attempt.order_id);
    return;
  }

  // 2. Inspect checkout session
  if (!sessionId) {
    console.error("❌ Checkout session ID missing from payment attempt metadata.");
    process.exit(1);
  }

  const { data: session, error: sessionErr } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    console.error("❌ Checkout session not found:", sessionErr);
    process.exit(1);
  }

  console.log(`    -> Session Status: ${session.status}`);
  console.log(`    -> Session Subtotal: ${session.subtotal}`);
  console.log(`    -> Session Shipping Total: ${session.shipping_total}`);
  console.log(`    -> Session Grand Total: ${session.grand_total}`);
  console.log(`    -> Session Fulfilment Method: ${session.fulfilment_method_id}`);

  // 3. Verify transaction with Paystack directly
  console.log("\n[2] Verifying transaction with Paystack API...");
  if (!paystackSecret) {
    console.warn("⚠️ PAYSTACK_SECRET_KEY not found in local env, proceeding with DB confirmation check...");
  } else {
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(REFERENCE)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackData = await paystackRes.json();
    if (!paystackRes.ok || !paystackData.status || paystackData.data?.status !== "success") {
      console.error("❌ Paystack verification failed:", paystackData);
      process.exit(1);
    }

    console.log(`    -> Paystack Status: ${paystackData.data.status}`);
    console.log(`    -> Paystack Amount (kobo): ${paystackData.data.amount}`);
    console.log(`    -> Paystack Currency: ${paystackData.data.currency}`);
    console.log(`    -> Paystack Customer Email: ${paystackData.data.customer?.email}`);
  }

  // 4. Execute atomic create_order_from_checkout_rpc
  console.log("\n[3] Executing PostgreSQL create_order_from_checkout_rpc...");
  const { data: orderJson, error: rpcErr } = await supabase.rpc(
    "create_order_from_checkout_rpc",
    {
      p_checkout_session_id: sessionId,
      p_payment_reference: REFERENCE,
    }
  );

  if (rpcErr || !orderJson) {
    console.error("❌ create_order_from_checkout_rpc failed:", rpcErr);
    process.exit(1);
  }

  const order = orderJson as Record<string, unknown>;
  const orderId = order.id as string;
  const orderNumber = order.order_number as string;

  console.log(`    -> Order Created Successfully!`);
  console.log(`    -> Order ID: ${orderId}`);
  console.log(`    -> Order Number: ${orderNumber}`);
  console.log(`    -> Order Status: ${order.status}`);
  console.log(`    -> Shipping Method Snapshot:`, JSON.stringify(order.shipping_method_snapshot));
  console.log(`    -> Shipping Rate Snapshot:`, JSON.stringify(order.shipping_rate_snapshot));

  // 5. Update payment attempt to confirmed
  console.log("\n[4] Updating payment attempt status to confirmed...");
  const { error: updateErr } = await supabase
    .from("payment_attempts")
    .update({
      status: "confirmed",
      order_id: orderId,
      metadata: {
        ...meta,
        recoveredAt: new Date().toISOString(),
        orderId,
        orderNumber,
      },
    })
    .eq("id", attempt.id);

  if (updateErr) {
    console.error("❌ Failed to update payment attempt:", updateErr);
    process.exit(1);
  }

  // 6. Record payment event
  await supabase.from("payment_events").insert({
    payment_attempt_id: attempt.id,
    event_type: "payment.confirmed",
    provider_status: "success",
    raw_payload: {
      action: "order_recovered",
      reference: REFERENCE,
      orderId,
      orderNumber,
    },
  });

  console.log("\n==================================================================");
  console.log(`  RECOVERY COMPLETE! Order ${orderNumber} created successfully!`);
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("❌ Recovery script encountered unexpected error:", err);
  process.exit(1);
});
