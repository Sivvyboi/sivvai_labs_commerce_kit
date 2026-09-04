/**
 * scripts/verify-phase1-phase2-variants.ts
 *
 * Real-Database Automated Verification Suite for Phase 1 & Phase 2:
 * - Phase 1: Variant Domain Contract & Database Invariants
 * - Phase 2: Variant Creation Lifecycle & Cartesian Generator
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

// Bypass Next.js 'server-only' package restriction in CLI script
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as unknown as NodeJS.Module;
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Domain helpers (pure client/server safe)
import {
  generateCartesianCombinations,
  normalizeOptionCombination,
  compareOptionCombinations,
  generateVariantSku,
} from "../lib/variants/combination";

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  ✅ PASS: ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) pass(label);
  else fail(label, detail);
}

const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];

async function cleanup() {
  console.log("\n🧹 Cleaning up test artifacts...");
  for (const orderId of createdOrderIds) {
    await sb.from("order_lines").delete().eq("order_id", orderId);
    await sb.from("orders").delete().eq("id", orderId);
  }

  for (const productId of createdProductIds) {
    // Delete variants (cascades inventory)
    const { data: vars } = await sb
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);

    if (vars && vars.length > 0) {
      const vIds = vars.map((v) => v.id);
      await sb.from("inventory_records").delete().in("variant_id", vIds);
      await sb.from("product_variants").delete().eq("product_id", productId);
    }

    // Delete option groups (cascades values)
    await sb.from("option_groups").delete().eq("product_id", productId);

    // Delete product
    await sb.from("products").delete().eq("id", productId);
  }
  console.log("   Cleanup completed.");
}

async function runVerification() {
  console.log("==================================================================");
  console.log("  Variant Domain Contract & Generation Lifecycle Verification Suite");
  console.log("==================================================================\n");

  const productService = await import("../services/product-service");
  const productRepo = await import("../lib/db/products");

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: Pure Domain Algorithm Verification
    // -------------------------------------------------------------------------
    console.log("[1/5] Testing pure domain combination algorithms...");

    const norm1 = normalizeOptionCombination({ " Size ": " L ", "Color": " Red " });
    assert(
      norm1["Color"] === "Red" && norm1["Size"] === "L",
      "normalizeOptionCombination trims keys and values"
    );

    const keys = Object.keys(norm1);
    assert(
      keys[0] === "Color" && keys[1] === "Size",
      "normalizeOptionCombination sorts keys alphabetically"
    );

    const compTrue = compareOptionCombinations(
      { Size: "M", Color: "Blue" },
      { Color: "Blue", Size: "M" }
    );
    assert(compTrue, "compareOptionCombinations recognizes semantically identical combos");

    const compFalse = compareOptionCombinations(
      { Size: "M", Color: "Blue" },
      { Size: "L", Color: "Blue" }
    );
    assert(!compFalse, "compareOptionCombinations differentiates distinct combos");

    const simpleCart = generateCartesianCombinations([]);
    assert(
      simpleCart.length === 1 && Object.keys(simpleCart[0]).length === 0,
      "generateCartesianCombinations returns [{}] for 0 option groups (Simple Product invariant)"
    );

    const multiCart = generateCartesianCombinations([
      { name: "Size", values: [{ label: "S" }, { label: "M" }] },
      { name: "Color", values: [{ label: "Red" }, { label: "Blue" }, { label: "Green" }] },
    ]);
    assert(
      multiCart.length === 6,
      `generateCartesianCombinations produces Cartesian product of 2x3 = 6 combos (got ${multiCart.length})`
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 2: Simple Product Baseline & Inventory Invariant
    // -------------------------------------------------------------------------
    console.log("\n[2/5] Testing Simple Product creation & 1-to-1 inventory invariant...");

    const nonce = Date.now();
    const simpleProduct = await productService.createProductAdmin(
      {
        name: `Test Variant Product ${nonce}`,
        slug: `test-variant-${nonce}`,
        description: "Test product for variant verification suite",
        base_price: 2500000,
        status: "draft",
      },
      15
    );
    createdProductIds.push(simpleProduct.id);

    const variants = await productRepo.findVariantsByProductId(simpleProduct.id);
    assert(variants.length === 1, `Simple product has exactly 1 default variant (got ${variants.length})`);

    const defaultVar = variants[0];
    assert(defaultVar.is_default === true, "Variant is marked is_default = true");
    assert(
      Object.keys(defaultVar.option_combination as object).length === 0,
      "Simple product variant option_combination is {}"
    );

    // Check inventory record existence
    const { data: invRecord } = await sb
      .from("inventory_records")
      .select("*")
      .eq("variant_id", defaultVar.id)
      .maybeSingle();

    assert(!!invRecord, "Inventory record exists for default variant");
    assert(
      invRecord?.on_hand_quantity === 15,
      `Inventory record on_hand_quantity equals initialStock 15 (got ${invRecord?.on_hand_quantity})`
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 3: Adding Option Groups & Cartesian Variant Generation
    // -------------------------------------------------------------------------
    console.log("\n[3/5] Testing adding Option Groups and Cartesian variant synchronization...");

    // Add Size group: S, M
    const groupSize = await productService.createOptionGroup(simpleProduct.id, "Size");
    await productService.addOptionValue(groupSize.id, "Small");
    await productService.addOptionValue(groupSize.id, "Medium");

    // Add Color group: Black, White
    const groupColor = await productService.createOptionGroup(simpleProduct.id, "Color");
    await productService.addOptionValue(groupColor.id, "Black");
    await productService.addOptionValue(groupColor.id, "White");

    // Sync variants: Expect 2x2 = 4 combinations
    const syncRes = await productService.syncProductVariants(simpleProduct.id);
    assert(
      syncRes.created === 4,
      `Sync created 4 new Cartesian variants (2 Sizes x 2 Colors) (got created=${syncRes.created})`
    );

    const postSyncVariants = await productRepo.findVariantsByProductId(simpleProduct.id);
    const activeVariants = postSyncVariants.filter((v) => v.status === "active");
    assert(activeVariants.length === 4, `Total active variants is 4 (got ${activeVariants.length})`);

    // Verify each variant has an inventory record
    const { data: allInv } = await sb
      .from("inventory_records")
      .select("id, variant_id")
      .in(
        "variant_id",
        activeVariants.map((v) => v.id)
      );

    assert(
      allInv?.length === 4,
      `All 4 generated variants have companion inventory records (got ${allInv?.length})`
    );

    // Verify exactly one variant is default
    const defaultCount = activeVariants.filter((v) => v.is_default).length;
    assert(defaultCount === 1, `Exactly one variant is designated default (got ${defaultCount})`);

    // Customize a SKU on one variant and verify it is preserved upon subsequent sync
    const firstVar = activeVariants[0];
    const customSku = `CUSTOM-${nonce}-001`;
    await productService.updateVariantAdmin(firstVar.id, { sku: customSku, price_override: 3000000 });

    // Re-sync: should not wipe custom SKU or price override
    const reSyncRes = await productService.syncProductVariants(simpleProduct.id);
    assert(
      reSyncRes.created === 0,
      `Re-sync with unchanged options created 0 new variants (idempotent)`
    );

    const { data: verifiedVar } = await sb
      .from("product_variants")
      .select("sku, price_override")
      .eq("id", firstVar.id)
      .single();

    assert(
      verifiedVar?.sku === customSku && verifiedVar?.price_override === 3000000,
      "Existing variant custom SKU and price override are preserved across syncs"
    );

    // -------------------------------------------------------------------------
    // TEST GROUP 4: Default Variant & Status Management
    // -------------------------------------------------------------------------
    console.log("\n[4/5] Testing default variant switching and status toggling...");

    const secondVar = activeVariants[1];
    await productService.setDefaultVariantAdmin(simpleProduct.id, secondVar.id);

    const recheckedVars = await productRepo.findVariantsByProductId(simpleProduct.id);
    const newDefault = recheckedVars.find((v) => v.is_default);
    assert(newDefault?.id === secondVar.id, "Second variant successfully set as default");

    const totalDefaults = recheckedVars.filter((v) => v.is_default).length;
    assert(totalDefaults === 1, `Database maintains exactly 1 default variant (got ${totalDefaults})`);

    // Toggle variant status to inactive
    await productService.toggleVariantStatusAdmin(secondVar.id, "inactive");
    const { data: inactVar } = await sb
      .from("product_variants")
      .select("status, archived_at")
      .eq("id", secondVar.id)
      .single();

    assert(inactVar?.status === "inactive", "Variant toggled to inactive status");
    assert(!!inactVar?.archived_at, "Variant has archived_at timestamp populated");

    // Re-activate variant
    await productService.toggleVariantStatusAdmin(secondVar.id, "active");
    const { data: actVar } = await sb
      .from("product_variants")
      .select("status, archived_at")
      .eq("id", secondVar.id)
      .single();

    assert(actVar?.status === "active" && actVar?.archived_at === null, "Variant reactivated cleanly");

    // -------------------------------------------------------------------------
    // TEST GROUP 5: Option Deletion & Order History Safety
    // -------------------------------------------------------------------------
    console.log("\n[5/5] Testing Option Value deletion & Historical Order safety...");

    // Case A: Deleting an option value on un-ordered variant cleanly prunes stale variants
    // Add value "Grey" to Color
    const greyVal = await productService.addOptionValue(groupColor.id, "Grey");
    await productService.syncProductVariants(simpleProduct.id); // 2x3 = 6 variants

    const sixVars = await productRepo.findVariantsByProductId(simpleProduct.id);
    assert(
      sixVars.filter((v) => v.status === "active").length === 6,
      "Sync after adding 'Grey' expanded active variants to 6"
    );

    // Delete "Grey" (un-ordered) -> should delete the 2 Grey variants
    await productService.deleteOptionValue(greyVal.id, simpleProduct.id);
    const fourVars = await productRepo.findVariantsByProductId(simpleProduct.id);
    const activeAfterDelete = fourVars.filter((v) => v.status === "active");
    assert(
      activeAfterDelete.length === 4,
      `Deleting un-ordered option value cleanly deletes stale variants (got ${activeAfterDelete.length})`
    );

    // Case B: Variant referenced in order_lines is NOT deleted; it is retired/deactivated
    const orderedVariant = activeAfterDelete[0];

    // Create a mock order and order_line referencing orderedVariant
    const orderNumber = `ORD-TEST-${nonce}`;
    const { data: order, error: ordErr } = await sb
      .from("orders")
      .insert({
        order_number: orderNumber,
        currency: "NGN",
        subtotal: 2500000,
        shipping_total: 0,
        discount_total: 0,
        tax_total: 0,
        grand_total: 2500000,
        status: "pending",
        guest_contact: { email: `test-${nonce}@sivvai.com` },
      })
      .select()
      .single();

    if (ordErr || !order) {
      throw new Error(`Failed to create mock order: ${ordErr?.message}`);
    }
    createdOrderIds.push(order.id);

    const { error: lineErr } = await sb.from("order_lines").insert({
      order_id: order.id,
      variant_id: orderedVariant.id,
      product_name_snapshot: simpleProduct.name,
      variant_label_snapshot: "Test Snapshot",
      sku_snapshot: orderedVariant.sku,
      unit_price_snapshot: 2500000,
      quantity: 1,
      line_total: 2500000,
    });

    if (lineErr) {
      throw new Error(`Failed to create mock order line: ${lineErr.message}`);
    }

    // Now delete Option Group "Size" entirely!
    // The variant orderedVariant has an order line. It MUST NOT be deleted (which would fail ON DELETE RESTRICT)!
    // It must be safely deactivated/archived.
    await productService.deleteOptionGroup(groupSize.id, simpleProduct.id);

    const { data: survivingVar } = await sb
      .from("product_variants")
      .select("id, status, archived_at")
      .eq("id", orderedVariant.id)
      .maybeSingle();

    assert(
      !!survivingVar,
      "Variant with order history was NOT hard-deleted from database (Order integrity preserved)"
    );
    assert(
      survivingVar?.status === "inactive" && !!survivingVar?.archived_at,
      "Ordered variant was safely retired to inactive + archived status"
    );
  } finally {
    await cleanup();
  }

  console.log("\n==================================================================");
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Verification suite failed with unexpected error:", err);
  cleanup().then(() => process.exit(1));
});
