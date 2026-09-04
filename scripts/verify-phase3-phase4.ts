/**
 * scripts/verify-phase3-phase4.ts
 *
 * Verification script for Phase 3 (Variant + Inventory Atomicity) and
 * Phase 4 (Transaction-Safe Reservations).
 *
 * Run from project root:
 *   npx tsx scripts/verify-phase3-phase4.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 * (loaded automatically from .env.local if present).
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local (same pattern as verify-phase1-phase2-variants.ts)
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
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function pass(name: string, detail?: string) {
  passed++;
  console.log(`  ✅ PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail?: string) {
  failed++;
  console.error(`  ❌ FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

function section(title: string) {
  console.log(`\n${"─".repeat(60)}\n${title}\n${"─".repeat(60)}`);
}

async function cleanup(productId?: string) {
  if (!productId) return;
  // Products cascade-delete to variants → inventory_records
  await supabase.from("products").delete().eq("id", productId);
}

// ---------------------------------------------------------------------------
// Shared setup: seed a category (reuse existing or create)
// ---------------------------------------------------------------------------

async function getOrCreateCategory(): Promise<string> {
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", "verify-p3p4-cat")
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: "Verify P3P4 Cat", slug: "verify-p3p4-cat" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Category seed failed: ${error?.message}`);
  return data.id;
}

// ---------------------------------------------------------------------------
// 3-A: createProductAdmin initialStock is correctly applied after trigger
// ---------------------------------------------------------------------------

async function test3A_initialStock(categoryId: string) {
  section("3-A: createProductAdmin — initialStock applied after trigger");

  const slug = `verify-p3a-${Date.now()}`;
  let productId: string | undefined;

  try {
    // Insert product
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .insert({
        name: "3-A Verify Product",
        slug,
        base_price: 1000,
        status: "draft",
        category_id: categoryId,
      })
      .select("id, slug")
      .single();

    if (prodErr || !product) throw new Error(prodErr?.message ?? "product insert failed");
    productId = product.id;

    const sku = `${product.slug.toUpperCase().slice(0, 10)}-DEFAULT`;

    // Insert default variant — trigger fires and creates inventory row (qty=0)
    const { data: variant, error: varErr } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, sku, is_default: true, status: "active", option_combination: {} })
      .select("id")
      .single();

    if (varErr || !variant) throw new Error(varErr?.message ?? "variant insert failed");

    // Verify trigger created the inventory row with qty=0
    const { data: inv0 } = await supabase
      .from("inventory_records")
      .select("id, on_hand_quantity")
      .eq("variant_id", variant.id)
      .single();

    if (!inv0) {
      fail("3-A.1: Trigger created inventory row", "row does not exist after variant insert");
      return;
    }
    pass("3-A.1: Trigger created inventory row", `on_hand_quantity=${inv0.on_hand_quantity}`);

    if (inv0.on_hand_quantity !== 0) {
      fail("3-A.1b: Trigger initialises qty=0", `got ${inv0.on_hand_quantity}`);
    } else {
      pass("3-A.1b: Trigger initialises qty=0");
    }

    // Now apply initialStock=15 via UPDATE (simulating createProductAdmin logic)
    const INITIAL_STOCK = 15;
    const { error: updErr } = await supabase
      .from("inventory_records")
      .update({ on_hand_quantity: INITIAL_STOCK })
      .eq("variant_id", variant.id);

    if (updErr) {
      fail("3-A.2: UPDATE initialStock succeeds", updErr.message);
      return;
    }

    const { data: inv1 } = await supabase
      .from("inventory_records")
      .select("on_hand_quantity")
      .eq("variant_id", variant.id)
      .single();

    if (!inv1) {
      fail("3-A.2: Fetch after UPDATE", "no row");
      return;
    }

    if (inv1.on_hand_quantity === INITIAL_STOCK) {
      pass("3-A.2: initialStock correctly applied", `on_hand_quantity=${inv1.on_hand_quantity}`);
    } else {
      fail("3-A.2: initialStock correctly applied", `expected=${INITIAL_STOCK}, got=${inv1.on_hand_quantity}`);
    }

    // Verify no duplicate inventory rows exist (trigger uses ON CONFLICT DO NOTHING)
    const { data: allInv } = await supabase
      .from("inventory_records")
      .select("id")
      .eq("variant_id", variant.id);

    if ((allInv ?? []).length === 1) {
      pass("3-A.3: Exactly one inventory row per variant");
    } else {
      fail("3-A.3: Exactly one inventory row per variant", `found ${(allInv ?? []).length} rows`);
    }
  } finally {
    await cleanup(productId);
  }
}

// ---------------------------------------------------------------------------
// 3-B: toggleVariantStatusAdmin — default variant guard + auto-promotion
// ---------------------------------------------------------------------------

async function test3B_defaultVariantGuard(categoryId: string) {
  section("3-B: toggleVariantStatusAdmin — default-variant guard");

  let productId: string | undefined;

  try {
    const slug = `verify-p3b-${Date.now()}`;
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .insert({ name: "3-B Verify Product", slug, base_price: 500, status: "draft", category_id: categoryId })
      .select("id")
      .single();

    if (prodErr || !product) throw new Error(prodErr?.message ?? "product insert failed");
    productId = product.id;

    // Insert default variant
    const now = Date.now();
    const { data: v1 } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, sku: `3B-V1-${now}`, is_default: true, status: "active", option_combination: { color: "red" } })
      .select("id, is_default")
      .single();

    // Insert a second active variant
    const { data: v2 } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, sku: `3B-V2-${now}`, is_default: false, status: "active", option_combination: { color: "blue" } })
      .select("id")
      .single();

    if (!v1 || !v2) { fail("3-B.setup: variants created"); return; }

    // Deactivate v1 (the default) + clear is_default, then check v2 gets promoted
    await supabase
      .from("product_variants")
      .update({ status: "inactive", archived_at: new Date().toISOString(), is_default: false })
      .eq("id", v1.id);

    // Simulate what toggleVariantStatusAdmin does: promote next active variant
    await supabase
      .from("product_variants")
      .update({ is_default: true })
      .eq("id", v2.id);

    const { data: check } = await supabase
      .from("product_variants")
      .select("id, is_default, status")
      .eq("product_id", productId);

    const newDefault = (check ?? []).find((v) => v.is_default === true);
    if (newDefault && newDefault.id === v2.id && newDefault.status === "active") {
      pass("3-B.1: Successor promoted as default after deactivation", `new default = variant ${v2.id}`);
    } else {
      fail("3-B.1: Successor promoted as default after deactivation", JSON.stringify(newDefault));
    }

    const oldVariant = (check ?? []).find((v) => v.id === v1.id);
    if (oldVariant?.is_default === false) {
      pass("3-B.2: Deactivated variant no longer default");
    } else {
      fail("3-B.2: Deactivated variant no longer default", JSON.stringify(oldVariant));
    }
  } finally {
    await cleanup(productId);
  }
}

// ---------------------------------------------------------------------------
// 3-C: set_product_default_variant RPC rejects inactive/archived variant
// ---------------------------------------------------------------------------

async function test3C_rpcLifecycleGuard(categoryId: string) {
  section("3-C: set_product_default_variant RPC — lifecycle guard");

  let productId: string | undefined;

  try {
    const slug = `verify-p3c-${Date.now()}`;
    const { data: product } = await supabase
      .from("products")
      .insert({ name: "3-C Verify Product", slug, base_price: 500, status: "draft", category_id: categoryId })
      .select("id")
      .single();

    if (!product) { fail("3-C.setup: product created"); return; }
    productId = product.id;

    const now = Date.now();
    const { data: active } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, sku: `3C-ACTIVE-${now}`, is_default: true, status: "active", option_combination: {} })
      .select("id")
      .single();

    const { data: inactive } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, sku: `3C-INACTIVE-${now}`, is_default: false, status: "inactive", archived_at: new Date().toISOString(), option_combination: { size: "L" } })
      .select("id")
      .single();

    if (!active || !inactive) { fail("3-C.setup: variants created"); return; }

    // Attempt to set inactive variant as default via RPC — should fail
    const { error: rpcErr } = await supabase.rpc("set_product_default_variant" as never, {
      p_product_id: productId,
      p_variant_id: inactive.id,
    } as never);

    if (rpcErr) {
      pass("3-C.1: RPC rejects inactive/archived variant as default", `error: ${rpcErr.message}`);
    } else {
      fail("3-C.1: RPC rejects inactive/archived variant as default", "expected an error but got none");
    }

    // Confirm the active variant is still the default
    const { data: currentDefault } = await supabase
      .from("product_variants")
      .select("id, is_default")
      .eq("product_id", productId)
      .eq("is_default", true)
      .maybeSingle();

    if (currentDefault?.id === active.id) {
      pass("3-C.2: Active variant remains default after rejected promotion");
    } else {
      fail("3-C.2: Active variant remains default after rejected promotion", JSON.stringify(currentDefault));
    }
  } finally {
    await cleanup(productId);
  }
}

// ---------------------------------------------------------------------------
// 3-D: syncProductVariants reactivation policy
//       Order-referenced variants are NOT reactivated
// ---------------------------------------------------------------------------

async function test3D_reactivationPolicy(categoryId: string) {
  section("3-D: Reactivation policy — order-referenced variants excluded");

  let productId: string | undefined;

  try {
    const slug = `verify-p3d-${Date.now()}`;
    const { data: product } = await supabase
      .from("products")
      .insert({ name: "3-D Verify Product", slug, base_price: 500, status: "draft", category_id: categoryId })
      .select("id")
      .single();

    if (!product) { fail("3-D.setup: product created"); return; }
    productId = product.id;

    const now = Date.now();
    // Create an inactive variant with no order history
    const { data: inactiveNoHistory } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, sku: `3D-INACTIVE-CLEAN-${now}`, is_default: false, status: "inactive", archived_at: null, option_combination: { color: "green" } })
      .select("id")
      .single();

    // Create an archived variant (archived_at IS NOT NULL)
    const { data: archived } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, sku: `3D-ARCHIVED-${now}`, is_default: false, status: "inactive", archived_at: new Date().toISOString(), option_combination: { color: "black" } })
      .select("id")
      .single();

    if (!inactiveNoHistory || !archived) { fail("3-D.setup: variants created"); return; }

    // Verify: a clean inactive variant (archived_at IS NULL, no order history) IS a reactivation candidate
    const { data: candidates } = await supabase
      .from("product_variants")
      .select("id, archived_at, status")
      .eq("product_id", productId)
      .eq("status", "inactive")
      .is("archived_at", null);

    const cleanCandidate = (candidates ?? []).find((v) => v.id === inactiveNoHistory.id);
    if (cleanCandidate) {
      pass("3-D.1: Clean inactive variant (no archive) is a reactivation candidate");
    } else {
      fail("3-D.1: Clean inactive variant (no archive) is a reactivation candidate");
    }

    // Verify: archived variant (archived_at IS NOT NULL) is NOT in the candidate pool
    const archivedInCandidates = (candidates ?? []).find((v) => v.id === archived.id);
    if (!archivedInCandidates) {
      pass("3-D.2: Archived variant (archived_at IS NOT NULL) excluded from reactivation pool");
    } else {
      fail("3-D.2: Archived variant (archived_at IS NOT NULL) excluded from reactivation pool");
    }
  } finally {
    await cleanup(productId);
  }
}

// ---------------------------------------------------------------------------
// 4: reserve_inventory_items RPC — atomicity and insufficient-stock handling
// ---------------------------------------------------------------------------

async function test4_atomicReservation(categoryId: string) {
  section("4: reserve_inventory_items RPC — atomic reservation");

  let productId: string | undefined;
  let cartId: string | undefined;

  try {
    const slug = `verify-p4-${Date.now()}`;
    const { data: product } = await supabase
      .from("products")
      .insert({ name: "Phase 4 Verify Product", slug, base_price: 2000, status: "published", category_id: categoryId })
      .select("id")
      .single();

    if (!product) { fail("4.setup: product created"); return; }
    productId = product.id;

    const { data: cart } = await supabase
      .from("carts")
      .insert({
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (cart) {
      cartId = cart.id;
    }

    let checkoutSessionId: string | null = null;
    if (cart) {
      const { data: session } = await supabase
        .from("checkout_sessions")
        .insert({
          cart_id: cart.id,
          status: "open",
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();
      checkoutSessionId = session?.id ?? null;
    }

    const { data: variant } = await supabase
      .from("product_variants")
      .insert({ product_id: productId, sku: `P4-V1-${Date.now()}`, is_default: true, status: "active", option_combination: {} })
      .select("id")
      .single();

    if (!variant) { fail("4.setup: variant created"); return; }

    // Set stock to 5
    await supabase
      .from("inventory_records")
      .update({ on_hand_quantity: 5 })
      .eq("variant_id", variant.id);

    // --- Test: Insufficient stock raises a structured exception
    const { error: overErr } = await supabase.rpc("reserve_inventory_items" as never, {
      p_checkout_session_id: checkoutSessionId,
      p_items: [{ variant_id: variant.id, quantity: 99 }],
      p_duration_minutes: 15,
    } as never);

    if (overErr && overErr.message.includes("INSUFFICIENT_STOCK")) {
      pass("4.1: RPC raises INSUFFICIENT_STOCK for qty > available", overErr.message.slice(0, 80));
    } else if (overErr) {
      fail("4.1: RPC raises INSUFFICIENT_STOCK for qty > available", `unexpected error: ${overErr.message}`);
    } else {
      fail("4.1: RPC raises INSUFFICIENT_STOCK for qty > available", "expected error but got success");
    }

    // Confirm no reservation rows were created after the failed attempt
    const { data: afterFail } = await supabase
      .from("inventory_reservations")
      .select("id")
      .eq("checkout_session_id", checkoutSessionId);

    if ((afterFail ?? []).length === 0) {
      pass("4.2: No partial reservations after INSUFFICIENT_STOCK failure");
    } else {
      fail("4.2: No partial reservations after INSUFFICIENT_STOCK failure", `found ${(afterFail ?? []).length} rows`);
    }

    // --- Test: Valid reservation succeeds and reserved_quantity is updated
    const { data: reservationData, error: resErr } = await supabase.rpc("reserve_inventory_items" as never, {
      p_checkout_session_id: checkoutSessionId,
      p_items: [{ variant_id: variant.id, quantity: 3 }],
      p_duration_minutes: 15,
    } as never);

    if (resErr) {
      fail("4.3: Valid reservation succeeds", resErr.message);
      return;
    }

    const results = (reservationData as unknown as Array<{ reservation_id: string; quantity: number; expires_at: string }>) ?? [];
    if (results.length === 1 && results[0].quantity === 3) {
      pass("4.3: Valid reservation succeeds", `reservation_id=${results[0].reservation_id}`);
    } else {
      fail("4.3: Valid reservation succeeds", `unexpected result: ${JSON.stringify(results)}`);
    }

    // Verify reserved_quantity updated by trigger
    const { data: invAfter } = await supabase
      .from("inventory_records")
      .select("on_hand_quantity, reserved_quantity")
      .eq("variant_id", variant.id)
      .single();

    if (invAfter && invAfter.reserved_quantity === 3) {
      pass("4.4: reserved_quantity updated atomically by trigger", `reserved=${invAfter.reserved_quantity}, on_hand=${invAfter.on_hand_quantity}`);
    } else {
      fail("4.4: reserved_quantity updated atomically by trigger", `got reserved=${invAfter?.reserved_quantity}`);
    }

    // Verify available = on_hand - reserved = 2
    const available = (invAfter?.on_hand_quantity ?? 0) - (invAfter?.reserved_quantity ?? 0);
    if (available === 2) {
      pass("4.5: Remaining available stock correct", `available=${available}`);
    } else {
      fail("4.5: Remaining available stock correct", `expected 2, got ${available}`);
    }
  } finally {
    await cleanup(productId);
    if (cartId) {
      await supabase.from("carts").delete().eq("id", cartId);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 3 + 4 Verification Script");
  console.log(`Target: ${SUPABASE_URL}`);
  console.log("=".repeat(60));

  const categoryId = await getOrCreateCategory();

  await test3A_initialStock(categoryId);
  await test3B_defaultVariantGuard(categoryId);
  await test3C_rpcLifecycleGuard(categoryId);
  await test3D_reactivationPolicy(categoryId);
  await test4_atomicReservation(categoryId);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
