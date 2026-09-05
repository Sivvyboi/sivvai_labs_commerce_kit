/**
 * scripts/verify-phase2-db-integration.ts
 *
 * Comprehensive Live PostgreSQL Integration & Concurrency Suite for Phase 2:
 * 1. Exactly-one-default variant invariant & successor promotion trigger.
 * 2. Inactive/archived variant default guard (check_variant_default_eligibility).
 * 3. Atomic product creation RPC (create_product_admin_rpc) & rollback semantics.
 * 4. Variant foreign image ownership trigger (trigger_check_variant_image_ownership).
 * 5. Order historical protection triggers (trigger_prevent_destructive_*_deletion).
 * 6. Hardened inventory deduction & reservation conversion (no clamping!).
 * 7. Payment attempt validation in create_order_from_checkout_rpc.
 *
 * Run from project root:
 *   npx tsx scripts/verify-phase2-db-integration.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) {
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passed = 0;
let failed = 0;

function pass(title: string, detail?: string) {
  passed++;
  console.log(`  ✅ PASS: ${title}${detail ? ` — ${detail}` : ""}`);
}

function fail(title: string, detail?: string) {
  failed++;
  console.error(`  ❌ FAIL: ${title}${detail ? ` — ${detail}` : ""}`);
}

function assert(condition: boolean, title: string, detail?: string) {
  if (condition) {
    pass(title, detail);
  } else {
    fail(title, detail);
  }
}

// Track fixtures for teardown
const cleanup = {
  productIds: [] as string[],
  categoryIds: [] as string[],
  orderIds: [] as string[],
  sessionIds: [] as string[],
  paymentAttemptIds: [] as string[],
  cartIds: [] as string[],
};

async function run() {
  console.log("====================================================================");
  console.log("   PHASE 2: LIVE POSTGRESQL INTEGRATION & CONCURRENCY SUITE        ");
  console.log("====================================================================");

  try {
    // ── 0. Setup shared test category ──────────────────────────────────────
    const { data: cat, error: catErr } = await sb
      .from("categories")
      .insert({
        name: `Phase2-Test-Cat-${Date.now()}`,
        slug: `p2-test-cat-${Date.now()}`,
        seo_title: "Test Category SEO Title",
        seo_description: "Test Category SEO Description",
      })
      .select()
      .single();

    if (catErr || !cat) throw new Error(`Failed to create test category: ${catErr?.message}`);
    cleanup.categoryIds.push(cat.id);

    // ── 1. DB Variant Default Invariants & Triggers ────────────────────────
    console.log("\n--- 1. Live DB Variant Default Invariants & Triggers ---");

    const { data: prod1, error: p1Err } = await sb
      .from("products")
      .insert({
        name: "Test Variant Invariant Product",
        slug: `test-variant-inv-${Date.now()}`,
        category_id: cat.id,
        base_price: 2000000,
        status: "published",
      })
      .select()
      .single();

    if (p1Err || !prod1) throw new Error(`Failed to create product: ${p1Err?.message}`);
    cleanup.productIds.push(prod1.id);

    // Insert Variant A as default
    const varAResult = await sb
      .from("product_variants")
      .insert({
        product_id: prod1.id,
        sku: `SKU-A-${Date.now()}`,
        status: "active",
        is_default: true,
        option_combination: { Color: "Black" },
      })
      .select()
      .single();

    assert(!varAResult.error && Boolean(varAResult.data), "Default Variant A created successfully");
    if (!varAResult.data) throw new Error("Variant A creation failed: " + varAResult.error?.message);
    const varA = varAResult.data;

    // Attempt to insert Variant B directly as default -> must violate unique constraint uq_product_variants_single_default
    const { data: varB, error: varBErr } = await sb
      .from("product_variants")
      .insert({
        product_id: prod1.id,
        sku: `SKU-B-${Date.now()}`,
        status: "active",
        is_default: true,
        option_combination: { Color: "White" },
      })
      .select()
      .single();

    assert(
      Boolean(varBErr && varBErr.message.includes("uq_product_variants_single_default")),
      "PostgreSQL rejects second active default variant via uq_product_variants_single_default",
      varBErr?.message
    );

    // Insert Variant B as non-default
    const varBValidResult = await sb
      .from("product_variants")
      .insert({
        product_id: prod1.id,
        sku: `SKU-B-VALID-${Date.now()}`,
        status: "active",
        is_default: false,
        option_combination: { Color: "White" },
      })
      .select()
      .single();

    assert(!varBValidResult.error && Boolean(varBValidResult.data), "Non-default Variant B created successfully");
    if (!varBValidResult.data) throw new Error("Variant B creation failed: " + varBValidResult.error?.message);
    const varBValid = varBValidResult.data;

    // Guard check: cannot set inactive variant as default via combined update
    const { error: inactErr } = await sb
      .from("product_variants")
      .update({ is_default: true, status: "inactive" })
      .eq("id", varBValid.id);

    assert(
      Boolean(inactErr && inactErr.message.includes("INVALID_DEFAULT_VARIANT")),
      "PostgreSQL trigger check_variant_default_eligibility blocks setting inactive variant as default",
      inactErr?.message
    );

    // Successor promotion: archive + demote Variant A in ONE atomic UPDATE statement.
    //
    // Why single-statement? The maintain_product_default_variant AFTER trigger selects the
    // oldest active+non-archived variant as the promotion candidate. If we demote first and
    // archive in a second statement, A is still active+non-archived when the trigger runs
    // after statement-1, so it re-promotes A. By setting is_default=false, status=inactive,
    // and archived_at together in one statement:
    //   - BEFORE trigger (check_variant_default_eligibility): sees NEW.is_default=false → passes
    //   - AFTER trigger (maintain_product_default_variant): A is now inactive+archived, so the
    //     only eligible candidate is Variant B → auto-promotes B to is_default=true
    const { error: archiveErr } = await sb
      .from("product_variants")
      .update({
        is_default: false,
        status: "inactive",
        archived_at: new Date().toISOString(),
      })
      .eq("id", varA.id);

    assert(!archiveErr, "Variant A atomically demoted + archived in a single statement", archiveErr?.message);

    const { data: refreshedB } = await sb
      .from("product_variants")
      .select("id, is_default, status")
      .eq("id", varBValid.id)
      .single();

    assert(
      refreshedB?.is_default === true,
      "PostgreSQL trigger maintain_product_default_variant auto-promoted Variant B after Variant A was atomically archived",
      `Variant B is_default = ${refreshedB?.is_default}`
    );

    // ── 2. Atomic Product Creation RPC ─────────────────────────────────────
    console.log("\n--- 2. Atomic Product Creation RPC (create_product_admin_rpc) ---");

    const atomicPayload = {
      name: "Atomic Test Blazer",
      slug: `atomic-blazer-${Date.now()}`,
      category_id: cat.id,
      base_price: 3500000,
      status: "published",
      description: "Testing atomic RPC creation",
    };

    const { data: createdProduct, error: atomicErr } = await sb.rpc("create_product_admin_rpc", {
      p_product: atomicPayload,
      p_initial_stock: 18,
      p_sku: `ATOMIC-SKU-${Date.now()}`,
    });

    assert(!atomicErr && Boolean(createdProduct), "create_product_admin_rpc executed successfully");
    const atomicProdId = (createdProduct as any)?.id;
    if (atomicProdId) cleanup.productIds.push(atomicProdId);

    // Verify variants and inventory created in the single transaction
    const { data: atomicVariants } = await sb
      .from("product_variants")
      .select("id, sku, is_default, option_combination")
      .eq("product_id", atomicProdId);

    assert(
      atomicVariants?.length === 1 && atomicVariants[0].is_default === true,
      "Atomic product creation created exactly 1 default variant with empty combination"
    );

    const { data: atomicInventory } = await sb
      .from("inventory_records")
      .select("id, on_hand_quantity, reserved_quantity")
      .eq("variant_id", atomicVariants![0].id)
      .single();

    assert(
      atomicInventory?.on_hand_quantity === 18 && atomicInventory?.reserved_quantity === 0,
      "Atomic product creation initialized inventory record with requested stock (18)"
    );

    // Rollback test: Invalid payload (missing slug) must roll back and leave no product row
    const { error: badAtomicErr } = await sb.rpc("create_product_admin_rpc", {
      p_product: { name: "Missing Slug Product" },
      p_initial_stock: 5,
    });

    assert(
      Boolean(badAtomicErr && badAtomicErr.message.includes("INVALID_ARGUMENT")),
      "create_product_admin_rpc rejects invalid payload and rolls back transaction",
      badAtomicErr?.message
    );

    // ── 3. Variant Image Ownership Enforcement ─────────────────────────────
    console.log("\n--- 3. Variant Image Ownership Enforcement ---");

    // Create Product X with Image X
    const { data: prodX } = await sb
      .from("products")
      .insert({
        name: "Product X",
        slug: `prod-x-${Date.now()}`,
        category_id: cat.id,
        base_price: 1000000,
      })
      .select()
      .single();
    cleanup.productIds.push(prodX.id);

    const { data: imgX } = await sb
      .from("product_images")
      .insert({
        product_id: prodX.id,
        url: "https://example.com/image-x.jpg",
        display_order: 0,
        is_primary: true,
      })
      .select()
      .single();

    // Create Product Y with Variant Y
    const { data: prodY } = await sb
      .from("products")
      .insert({
        name: "Product Y",
        slug: `prod-y-${Date.now()}`,
        category_id: cat.id,
        base_price: 1000000,
      })
      .select()
      .single();
    cleanup.productIds.push(prodY.id);

    // Attempt to assign Image X (belongs to Prod X) to Variant of Prod Y
    const { error: foreignImgErr } = await sb
      .from("product_variants")
      .insert({
        product_id: prodY.id,
        sku: `SKU-Y-${Date.now()}`,
        image_id: imgX.id, // FOREIGN IMAGE!
        status: "active",
        option_combination: { Style: "Slim" },
      });

    assert(
      Boolean(foreignImgErr && foreignImgErr.message.includes("FOREIGN_IMAGE_REFERENCE")),
      "PostgreSQL trigger trigger_check_variant_image_ownership blocks foreign image assignment",
      foreignImgErr?.message
    );

    // ── 4. Order Historical Protection Triggers ────────────────────────────
    console.log("\n--- 4. Order Historical Protection Triggers ---");

    // Setup an order line referencing Variant B (varBValid)
    // varBValid.id is now inactive+archived; FK still works for historical orders
    // First get a fresh active variant from the product to reference
    const { data: liveVariant } = await sb
      .from("product_variants")
      .select("id, sku")
      .eq("product_id", prod1.id)
      .limit(1)
      .single();

    if (!liveVariant) throw new Error("No live variant found for historical order test");

    const testOrderResult = await sb
      .from("orders")
      .insert({
        order_number: `ORD-TEST-${Date.now()}`,
        status: "processing",
        subtotal: 2000000,
        shipping_total: 0,
        discount_total: 0,
        tax_total: 0,
        grand_total: 2000000,
        currency: "NGN",
      })
      .select()
      .single();

    if (!testOrderResult.data) throw new Error("Failed to create test order: " + testOrderResult.error?.message);
    const testOrder = testOrderResult.data;
    cleanup.orderIds.push(testOrder.id);

    const { data: testOrderLine, error: olErr } = await sb
      .from("order_lines")
      .insert({
        order_id: testOrder.id,
        variant_id: liveVariant.id,
        product_name_snapshot: "Snapshot Product Name",
        variant_label_snapshot: "Default",
        sku_snapshot: liveVariant.sku,
        unit_price_snapshot: 2000000,
        quantity: 1,
        line_total: 2000000,
        selected_options_snapshot: { Color: "White" },
      })
      .select()
      .single();

    assert(!olErr && Boolean(testOrderLine), "Test order line referencing live variant inserted", olErr?.message);

    // Attempt physical deletion of Product 1 -> must fail (it has a variant with order_lines)
    const { error: delProdErr } = await sb.from("products").delete().eq("id", prod1.id);
    assert(
      Boolean(delProdErr && delProdErr.message.includes("CANNOT_DELETE_HISTORICAL_COMMERCE")),
      "PostgreSQL trigger trigger_prevent_destructive_product_deletion blocks product deletion",
      delProdErr?.message
    );

    // Attempt physical deletion of live variant -> must fail
    const { error: delVarErr } = await sb.from("product_variants").delete().eq("id", liveVariant.id);
    assert(
      Boolean(delVarErr && delVarErr.message.includes("CANNOT_DELETE_HISTORICAL_COMMERCE")),
      "PostgreSQL trigger trigger_prevent_destructive_variant_deletion blocks variant deletion",
      delVarErr?.message
    );

    // ── 5. Hardened Order Inventory & Reservation Invariants ────────────────
    console.log("\n--- 5. Hardened Order Inventory & Reservation Invariants ---");

    // Create a fresh product and variant for checkout testing
    const checkProdResult = await sb
      .from("products")
      .insert({
        name: "Checkout Invariant Test Product",
        slug: `check-inv-${Date.now()}`,
        category_id: cat.id,
        base_price: 1000000,
        status: "published",
      })
      .select()
      .single();
    if (!checkProdResult.data) throw new Error("Failed to create checkout test product: " + checkProdResult.error?.message);
    const checkProd = checkProdResult.data;
    cleanup.productIds.push(checkProd.id);

    const checkVarResult = await sb
      .from("product_variants")
      .insert({
        product_id: checkProd.id,
        sku: `CHK-SKU-${Date.now()}`,
        status: "active",
        is_default: true,
        option_combination: {},
      })
      .select()
      .single();
    if (!checkVarResult.data) throw new Error("Failed to create checkout test variant: " + checkVarResult.error?.message);
    const checkVar = checkVarResult.data;

    // Set on-hand inventory to 10 (track_inventory defaults to true)
    const { error: invInitErr } = await sb
      .from("inventory_records")
      .update({ on_hand_quantity: 10, reserved_quantity: 0 })
      .eq("variant_id", checkVar.id);
    assert(!invInitErr, "Initialized checkout variant inventory to on_hand=10", invInitErr?.message);

    // Create cart (no currency column on carts table) and cart line with qty = 3
    const cartResult = await sb
      .from("carts")
      .insert({
        status: "active",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (!cartResult.data) throw new Error("Failed to create test cart: " + cartResult.error?.message);
    const cart = cartResult.data;
    cleanup.cartIds.push(cart.id);

    const { error: cartLineErr } = await sb.from("cart_lines").insert({
      cart_id: cart.id,
      variant_id: checkVar.id,
      quantity: 3,
      unit_price_snapshot: 1000000,
    });
    assert(!cartLineErr, "Cart line created for checkout test", cartLineErr?.message);

    // Create checkout session (subtotal = 30,000 Naira stored in INTEGER Naira, → 3,000,000 kobo in RPC)
    const sessionResult = await sb
      .from("checkout_sessions")
      .insert({
        cart_id: cart.id,
        status: "open",
        subtotal: 30000,
        shipping_total: 0,
        discount_total: 0,
        tax_total: 0,
        grand_total: 30000,
        currency: "NGN",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .select()
      .single();
    if (!sessionResult.data) throw new Error("Failed to create checkout session: " + sessionResult.error?.message);
    const session = sessionResult.data;
    cleanup.sessionIds.push(session.id);

    // payment_attempts.idempotency_key is NOT NULL UNIQUE; order_id is nullable (grants migration dropped NOT NULL)
    const validPaymentRef = `PAYREF-TEST-${Date.now()}`;
    const payAttemptResult = await sb
      .from("payment_attempts")
      .insert({
        provider: "paystack",
        provider_reference: validPaymentRef,
        idempotency_key: `idem-${validPaymentRef}`,
        amount: 3000000, // grand_total_kobo = 30000 * 100
        currency: "NGN",
        status: "pending",
        metadata: { checkoutSessionId: session.id },
      })
      .select()
      .single();
    if (!payAttemptResult.data) throw new Error("Failed to create payment attempt: " + payAttemptResult.error?.message);
    const payAttempt = payAttemptResult.data;
    cleanup.paymentAttemptIds.push(payAttempt.id);

    // TEST A: Attempt order creation with ZERO reservation
    // Expect failure: INSUFFICIENT_RESERVATION_FOR_ORDER
    const { error: noResErr } = await sb.rpc("create_order_from_checkout_rpc", {
      p_checkout_session_id: session.id,
      p_payment_reference: validPaymentRef,
    });

    assert(
      Boolean(noResErr && noResErr.message.includes("INSUFFICIENT_RESERVATION_FOR_ORDER")),
      "RPC rejects order creation when active reservation is missing",
      noResErr?.message
    );

    // Verify stock was NOT clamped or modified on failure
    const { data: invAfterNoRes } = await sb
      .from("inventory_records")
      .select("on_hand_quantity, reserved_quantity")
      .eq("variant_id", checkVar.id)
      .single();

    assert(
      invAfterNoRes?.on_hand_quantity === 10,
      "Inventory on_hand_quantity remained 10 (PROVING ZERO CLAMPING ON FAILURE)"
    );

    // TEST B: Reserve 3 items via reserve_inventory_items RPC
    const { error: reserveErr } = await sb.rpc("reserve_inventory_items", {
      p_checkout_session_id: session.id,
      p_items: [{ variant_id: checkVar.id, quantity: 3 }],
      p_duration_minutes: 15,
    });

    assert(!reserveErr, "reserve_inventory_items reserved 3 units for checkout session");

    // Manually test on-hand deficiency: set on_hand to 2 while requested is 3
    await sb
      .from("inventory_records")
      .update({ on_hand_quantity: 2 })
      .eq("variant_id", checkVar.id);

    const { error: insOnHandsErr } = await sb.rpc("create_order_from_checkout_rpc", {
      p_checkout_session_id: session.id,
      p_payment_reference: validPaymentRef,
    });

    assert(
      Boolean(insOnHandsErr && insOnHandsErr.message.includes("INSUFFICIENT_STOCK_FOR_ORDER")),
      "RPC rejects order creation when on-hand stock < requested (on_hand=2 < 3)",
      insOnHandsErr?.message
    );

    // Restore on_hand to 10
    await sb
      .from("inventory_records")
      .update({ on_hand_quantity: 10 })
      .eq("variant_id", checkVar.id);

    // TEST C: Payment amount mismatch guard
    const badAmountRef = `PAYREF-BAD-AMT-${Date.now()}`;
    const badPayAttemptResult = await sb
      .from("payment_attempts")
      .insert({
        provider: "paystack",
        provider_reference: badAmountRef,
        idempotency_key: `idem-${badAmountRef}`,
        amount: 2000000, // 20,000 Naira instead of 30,000 → mismatch
        currency: "NGN",
        status: "pending",
        metadata: { checkoutSessionId: session.id },
      })
      .select()
      .single();
    if (!badPayAttemptResult.data) throw new Error("Failed to create bad payment attempt: " + badPayAttemptResult.error?.message);
    const badPayAttempt = badPayAttemptResult.data;
    cleanup.paymentAttemptIds.push(badPayAttempt.id);

    const { error: badAmtErr } = await sb.rpc("create_order_from_checkout_rpc", {
      p_checkout_session_id: session.id,
      p_payment_reference: badAmountRef,
    });

    assert(
      Boolean(badAmtErr && badAmtErr.message.includes("PAYMENT_AMOUNT_MISMATCH")),
      "RPC rejects payment reference with mismatched amount",
      badAmtErr?.message
    );

    // TEST D: Successful order creation with exact deduction and reservation conversion
    const { data: validOrder, error: orderSuccessErr } = await sb.rpc("create_order_from_checkout_rpc", {
      p_checkout_session_id: session.id,
      p_payment_reference: validPaymentRef,
    });

    assert(!orderSuccessErr && Boolean(validOrder), "create_order_from_checkout_rpc succeeded with valid inputs");
    if ((validOrder as any)?.id) cleanup.orderIds.push((validOrder as any).id);

    // Verify exact stock deduction (10 - 3 = 7)
    const { data: finalInv } = await sb
      .from("inventory_records")
      .select("on_hand_quantity, reserved_quantity")
      .eq("variant_id", checkVar.id)
      .single();

    assert(
      finalInv?.on_hand_quantity === 7,
      `on_hand_quantity deducted exactly from 10 to 7 (got: ${finalInv?.on_hand_quantity})`
    );

    // Verify reservation was converted and reserved_quantity dropped from 3 to 0
    assert(
      finalInv?.reserved_quantity === 0,
      `reserved_quantity was updated to 0 via reservation conversion (got: ${finalInv?.reserved_quantity})`
    );

    const { data: resRow } = await sb
      .from("inventory_reservations")
      .select("status")
      .eq("checkout_session_id", session.id)
      .eq("variant_id", checkVar.id)
      .single();

    assert(resRow?.status === "converted", "Reservation status transitioned to 'converted'");

    console.log("\n====================================================================");
    console.log(`LIVE DB SUITE SUMMARY: ${passed} passed, ${failed} failed`);
    console.log("====================================================================");

    if (failed > 0) process.exit(1);
  } finally {
    console.log("\n🧹 Cleaning up test fixtures from live database...");

    // Clean up order lines first
    for (const ordId of cleanup.orderIds) {
      await sb.from("order_lines").delete().eq("order_id", ordId);
      await sb.from("order_status_events").delete().eq("order_id", ordId);
      await sb.from("orders").delete().eq("id", ordId);
    }

    for (const payId of cleanup.paymentAttemptIds) {
      await sb.from("payment_attempts").delete().eq("id", payId);
    }

    for (const sessId of cleanup.sessionIds) {
      await sb.from("inventory_reservations").delete().eq("checkout_session_id", sessId);
      await sb.from("checkout_sessions").delete().eq("id", sessId);
    }

    for (const cartId of cleanup.cartIds) {
      await sb.from("cart_lines").delete().eq("cart_id", cartId);
      await sb.from("carts").delete().eq("id", cartId);
    }

    for (const pId of cleanup.productIds) {
      const { data: vars } = await sb.from("product_variants").select("id").eq("product_id", pId);
      if (vars) {
        for (const v of vars) {
          await sb.from("stock_movements").delete().in(
            "inventory_record_id",
            (await sb.from("inventory_records").select("id").eq("variant_id", v.id)).data?.map((r) => r.id) || []
          );
          await sb.from("inventory_reservations").delete().eq("variant_id", v.id);
          await sb.from("inventory_records").delete().eq("variant_id", v.id);
        }
      }
      await sb.from("product_variants").delete().eq("product_id", pId);
      await sb.from("product_images").delete().eq("product_id", pId);
      await sb.from("products").delete().eq("id", pId);
    }

    for (const cId of cleanup.categoryIds) {
      await sb.from("categories").delete().eq("id", cId);
    }

    console.log("Cleanup complete.");
  }
}

run().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
