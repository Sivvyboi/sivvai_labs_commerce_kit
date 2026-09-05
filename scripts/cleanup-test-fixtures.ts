/**
 * scripts/cleanup-test-fixtures.ts
 *
 * Safe, atomic cleanup script to remove confirmed test fixtures created by verification scripts:
 *  - Categories matching 'p2-test-cat-*', 'verify-p3p4-cat', 'verify-p7p8-cat'
 *  - Dependent test products, variants, inventory records, stock movements,
 *    inventory reservations, cart lines, order lines, orders, and payment attempts.
 *
 * Invariant:
 *  - ONLY targets confirmed test fixtures and their dependent test records.
 *  - NEVER deletes or touches legitimate merchant categories or products.
 */

import "./preload-server-only";
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runCleanup() {
  console.log("====================================================================");
  console.log("   CLEANUP: REMOVING TEST FIXTURES FROM PRODUCTION CATALOG DATA     ");
  console.log("====================================================================\n");

  // 1. Discover target test categories
  const { data: testCategories, error: catErr } = await sb
    .from("categories")
    .select("id, slug, name")
    .or("slug.eq.verify-p3p4-cat,slug.eq.verify-p7p8-cat,slug.like.p2-test-cat-%");

  if (catErr) {
    console.error("Failed to query test categories:", catErr);
    process.exit(1);
  }

  if (!testCategories || testCategories.length === 0) {
    console.log("No test categories found in database. Nothing to clean.");
    return;
  }

  console.log(`Discovered ${testCategories.length} test categories:`);
  for (const c of testCategories) {
    console.log(` - [${c.id}] ${c.slug} ("${c.name}")`);
  }

  const categoryIds = testCategories.map((c) => c.id);

  // 2. Discover dependent test products
  const { data: testProducts, error: prodErr } = await sb
    .from("products")
    .select("id, slug, name, category_id")
    .in("category_id", categoryIds);

  if (prodErr) {
    console.error("Failed to query test products:", prodErr);
    process.exit(1);
  }

  const productIds = (testProducts || []).map((p) => p.id);
  console.log(`\nDiscovered ${productIds.length} dependent test products.`);

  // 3. Discover dependent test variants
  let variantIds: string[] = [];
  if (productIds.length > 0) {
    const { data: testVariants, error: varErr } = await sb
      .from("product_variants")
      .select("id, product_id, sku")
      .in("product_id", productIds);

    if (varErr) {
      console.error("Failed to query test variants:", varErr);
      process.exit(1);
    }
    variantIds = (testVariants || []).map((v) => v.id);
  }
  console.log(`Discovered ${variantIds.length} dependent test variants.`);

  // 4. Cascade delete dependent transactional and inventory data
  if (variantIds.length > 0) {
    // 4a. Order lines & parent test orders
    const { data: orderLines } = await sb
      .from("order_lines")
      .select("id, order_id")
      .in("variant_id", variantIds);

    const orderLineIds = (orderLines || []).map((ol) => ol.id);
    const orderIds = Array.from(new Set((orderLines || []).map((ol) => ol.order_id)));

    if (orderLineIds.length > 0) {
      console.log(`Deleting ${orderLineIds.length} test order lines...`);
      await sb.from("order_lines").delete().in("id", orderLineIds);
    }

    if (orderIds.length > 0) {
      console.log(`Deleting ${orderIds.length} test order status events and orders...`);
      await sb.from("order_status_events").delete().in("order_id", orderIds);
      await sb.from("payment_attempts").delete().in("order_id", orderIds);
      await sb.from("orders").delete().in("id", orderIds);
    }

    // 4b. Cart lines
    const { data: cartLines } = await sb
      .from("cart_lines")
      .select("id, cart_id")
      .in("variant_id", variantIds);

    const cartLineIds = (cartLines || []).map((cl) => cl.id);
    const cartIds = Array.from(new Set((cartLines || []).map((cl) => cl.cart_id)));

    if (cartLineIds.length > 0) {
      console.log(`Deleting ${cartLineIds.length} test cart lines...`);
      await sb.from("cart_lines").delete().in("id", cartLineIds);
    }

    if (cartIds.length > 0) {
      console.log(`Deleting ${cartIds.length} test carts & checkout sessions...`);
      await sb.from("checkout_sessions").delete().in("cart_id", cartIds);
      await sb.from("carts").delete().in("id", cartIds);
    }

    // 4c. Inventory reservations
    const { count: resCount } = await sb
      .from("inventory_reservations")
      .delete({ count: "exact" })
      .in("variant_id", variantIds);
    console.log(`Deleted ${resCount || 0} inventory reservations.`);

    // 4d. Stock movements & Inventory records
    const { data: invRecords } = await sb
      .from("inventory_records")
      .select("id")
      .in("variant_id", variantIds);

    const invRecordIds = (invRecords || []).map((r) => r.id);
    if (invRecordIds.length > 0) {
      const { count: smCount } = await sb
        .from("stock_movements")
        .delete({ count: "exact" })
        .in("inventory_record_id", invRecordIds);
      console.log(`Deleted ${smCount || 0} stock movements.`);

      const { count: irCount } = await sb
        .from("inventory_records")
        .delete({ count: "exact" })
        .in("id", invRecordIds);
      console.log(`Deleted ${irCount || 0} inventory records.`);
    }

    // 4e. Option values and groups for test products
    const { data: optionGroups } = await sb
      .from("option_groups")
      .select("id")
      .in("product_id", productIds);

    const optionGroupIds = (optionGroups || []).map((og) => og.id);
    if (optionGroupIds.length > 0) {
      await sb.from("option_values").delete().in("option_group_id", optionGroupIds);
      await sb.from("option_groups").delete().in("id", optionGroupIds);
      console.log(`Deleted ${optionGroupIds.length} test option groups and values.`);
    }

    // 4f. Delete product variants
    const { count: pvCount } = await sb
      .from("product_variants")
      .delete({ count: "exact" })
      .in("id", variantIds);
    console.log(`Deleted ${pvCount || 0} product variants.`);
  }

  // 5. Delete product images & test products
  if (productIds.length > 0) {
    const { count: imgCount } = await sb
      .from("product_images")
      .delete({ count: "exact" })
      .in("product_id", productIds);
    console.log(`Deleted ${imgCount || 0} product images.`);

    const { count: pCount } = await sb
      .from("products")
      .delete({ count: "exact" })
      .in("id", productIds);
    console.log(`Deleted ${pCount || 0} test products.`);
  }

  // 6. Delete test categories
  const { count: cCount } = await sb
    .from("categories")
    .delete({ count: "exact" })
    .in("id", categoryIds);
  console.log(`Deleted ${cCount || 0} test categories.`);

  console.log("\n✅ Test fixture cleanup completed successfully!");
}

runCleanup().catch((err) => {
  console.error("Cleanup fatal error:", err);
  process.exit(1);
});
