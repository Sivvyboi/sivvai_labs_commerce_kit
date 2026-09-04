/**
 * scripts/verify-phase5-phase6.ts
 *
 * Automated Verification Suite for:
 * - Phase 5: Deterministic Variant Selection (Zero Fallback)
 * - Phase 6: Multi-Dimensional Variant Availability Matrix
 *
 * Tests domain algorithms, UI contract invariants, and real-database integrations.
 *
 * Run from project root:
 *   npx tsx scripts/verify-phase5-phase6.ts
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  resolveVariantByCombination,
  buildVariantAvailabilityMatrix,
  getOptionValueMatrixStatus,
  isVariantInStock,
  normalizeOptionCombination,
  compareOptionCombinations,
  type VariantLike,
  type OptionGroupInput,
} from "../lib/variants/combination";

// ---------------------------------------------------------------------------
// Environment bootstrap
// ---------------------------------------------------------------------------

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

// Bypass Next.js 'server-only' in CLI test runner
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as unknown as NodeJS.Module;
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Test harness
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

// ---------------------------------------------------------------------------
// SECTION 1: Pure Domain Resolver Tests (Phase 5)
// ---------------------------------------------------------------------------

function testPhase5DomainResolver() {
  section("PHASE 5: Deterministic Combination Resolver (Zero Fallback)");

  const mockVariants: VariantLike[] = [
    {
      id: "var-red-s",
      status: "active",
      sku: "TSHIRT-RED-S",
      option_combination: { Color: "Red", Size: "S" },
      price_override: 2000000,
      inventory: { on_hand_quantity: 5, reserved_quantity: 0, track_inventory: true },
    },
    {
      id: "var-red-m",
      status: "active",
      sku: "TSHIRT-RED-M",
      option_combination: { Color: "Red", Size: "M" },
      price_override: 2000000,
      inventory: { on_hand_quantity: 0, reserved_quantity: 0, track_inventory: true },
    },
    {
      id: "var-blue-s",
      status: "active",
      sku: "TSHIRT-BLUE-S",
      option_combination: { Color: "Blue", Size: "S" },
      price_override: 2200000,
      inventory: { on_hand_quantity: 3, reserved_quantity: 1, track_inventory: true },
    },
    {
      id: "var-blue-m",
      status: "inactive", // Inactive variant!
      sku: "TSHIRT-BLUE-M",
      option_combination: { Color: "Blue", Size: "M" },
      price_override: 2200000,
      inventory: { on_hand_quantity: 10, reserved_quantity: 0, track_inventory: true },
    },
  ];

  const requiredGroups = ["Color", "Size"];

  // 1. Exact match resolves to correct variant
  const r1 = resolveVariantByCombination(mockVariants, { Color: "Red", Size: "S" }, requiredGroups);
  if (r1?.id === "var-red-s") {
    pass("Exact match resolves to correct variant ID (var-red-s)");
  } else {
    fail("Exact match failed", `Expected var-red-s, got ${r1?.id}`);
  }

  // 2. Key order invariance in selections
  const r2 = resolveVariantByCombination(mockVariants, { Size: "S", Color: "Red" }, requiredGroups);
  if (r2?.id === "var-red-s") {
    pass("Key order in selections does not affect deterministic resolution");
  } else {
    fail("Key order resolution failed", `Expected var-red-s, got ${r2?.id}`);
  }

  // 3. ZERO FALLBACK: Non-existent combination returns null (Never falls back to partial match)
  const r3 = resolveVariantByCombination(mockVariants, { Color: "Red", Size: "L" }, requiredGroups);
  if (r3 === null) {
    pass("Non-existent combination (Red + L) returns null without falling back to Red + S/M");
  } else {
    fail("Non-existent combination fell back to incorrect variant", `Got ${r3.id}`);
  }

  // 4. Incomplete selection returns null (No guessing)
  const r4 = resolveVariantByCombination(mockVariants, { Color: "Red" }, requiredGroups);
  if (r4 === null) {
    pass("Incomplete selection ({ Color: 'Red' }) returns null when Size is required");
  } else {
    fail("Incomplete selection returned a variant unexpectedly", `Got ${r4?.id}`);
  }

  // 5. Inactive variant returns null
  const r5 = resolveVariantByCombination(mockVariants, { Color: "Blue", Size: "M" }, requiredGroups);
  if (r5 === null) {
    pass("Inactive variant returns null even when combination matches");
  } else {
    fail("Inactive variant was resolved as active", `Got ${r5?.id}`);
  }

  // 6. Simple product resolution
  const simpleVariants: VariantLike[] = [
    {
      id: "var-simple-default",
      status: "active",
      sku: "BOOK-DEFAULT",
      option_combination: {},
      is_default: true,
      inventory: { on_hand_quantity: 10, reserved_quantity: 0, track_inventory: true },
    },
  ];
  const r6 = resolveVariantByCombination(simpleVariants, {}, []);
  if (r6?.id === "var-simple-default") {
    pass("Simple product ({}) resolves to default variant");
  } else {
    fail("Simple product resolution failed", `Expected var-simple-default, got ${r6?.id}`);
  }
}

// ---------------------------------------------------------------------------
// SECTION 2: Variant Availability Matrix Tests (Phase 6)
// ---------------------------------------------------------------------------

function testPhase6AvailabilityMatrix() {
  section("PHASE 6: Multi-Dimensional Variant Availability Matrix");

  const optionGroups: OptionGroupInput[] = [
    {
      name: "Color",
      values: [{ label: "Red" }, { label: "Blue" }],
    },
    {
      name: "Size",
      values: [{ label: "S" }, { label: "M" }, { label: "L" }],
    },
  ];

  const variants: VariantLike[] = [
    // Red / S -> In stock
    {
      id: "var-red-s",
      status: "active",
      option_combination: { Color: "Red", Size: "S" },
      inventory: { on_hand_quantity: 5, reserved_quantity: 0, track_inventory: true },
    },
    // Red / M -> Out of stock (on hand = 0)
    {
      id: "var-red-m",
      status: "active",
      option_combination: { Color: "Red", Size: "M" },
      inventory: { on_hand_quantity: 0, reserved_quantity: 0, track_inventory: true },
    },
    // Red / L -> DOES NOT EXIST in catalog
    // Blue / S -> Out of stock (on hand 2, reserved 2 -> available 0)
    {
      id: "var-blue-s",
      status: "active",
      option_combination: { Color: "Blue", Size: "S" },
      inventory: { on_hand_quantity: 2, reserved_quantity: 2, track_inventory: true },
    },
    // Blue / M -> In stock
    {
      id: "var-blue-m",
      status: "active",
      option_combination: { Color: "Blue", Size: "M" },
      inventory: { on_hand_quantity: 4, reserved_quantity: 0, track_inventory: true },
    },
    // Blue / L -> In stock (untracked stock)
    {
      id: "var-blue-l",
      status: "active",
      option_combination: { Color: "Blue", Size: "L" },
      inventory: { on_hand_quantity: 0, reserved_quantity: 0, track_inventory: false },
    },
  ];

  // Test 1: Given selection { Color: "Red" }, evaluate Size options:
  const matrixRed = buildVariantAvailabilityMatrix(variants, optionGroups, { Color: "Red" });

  const sizeSStatus = matrixRed["Size"]["S"]?.status;
  const sizeMStatus = matrixRed["Size"]["M"]?.status;
  const sizeLStatus = matrixRed["Size"]["L"]?.status;

  if (sizeSStatus === "AVAILABLE") {
    pass("Size S is AVAILABLE for Color Red (stock = 5)");
  } else {
    fail("Size S availability status incorrect", `Expected AVAILABLE, got ${sizeSStatus}`);
  }

  if (sizeMStatus === "OUT_OF_STOCK") {
    pass("Size M is OUT_OF_STOCK for Color Red (stock = 0)");
  } else {
    fail("Size M availability status incorrect", `Expected OUT_OF_STOCK, got ${sizeMStatus}`);
  }

  if (sizeLStatus === "UNAVAILABLE") {
    pass("Size L is UNAVAILABLE for Color Red (combination does not exist in catalog)");
  } else {
    fail("Size L availability status incorrect", `Expected UNAVAILABLE, got ${sizeLStatus}`);
  }

  // Test 2: Given selection { Size: "L" }, evaluate Color options:
  const matrixLarge = buildVariantAvailabilityMatrix(variants, optionGroups, { Size: "L" });

  const colorRedStatus = matrixLarge["Color"]["Red"]?.status;
  const colorBlueStatus = matrixLarge["Color"]["Blue"]?.status;

  if (colorRedStatus === "UNAVAILABLE") {
    pass("Color Red is UNAVAILABLE when Size L is selected");
  } else {
    fail("Color Red status incorrect for Size L", `Expected UNAVAILABLE, got ${colorRedStatus}`);
  }

  if (colorBlueStatus === "AVAILABLE") {
    pass("Color Blue is AVAILABLE when Size L is selected (untracked stock)");
  } else {
    fail("Color Blue status incorrect for Size L", `Expected AVAILABLE, got ${colorBlueStatus}`);
  }

  // Test 3: 3-Dimensional Availability Matrix (Color x Size x Material)
  const groups3D: OptionGroupInput[] = [
    { name: "Color", values: [{ label: "Black" }] },
    { name: "Size", values: [{ label: "S" }] },
    { name: "Material", values: [{ label: "Cotton" }, { label: "Silk" }] },
  ];
  const variants3D: VariantLike[] = [
    {
      id: "var-black-s-cotton",
      status: "active",
      option_combination: { Color: "Black", Size: "S", Material: "Cotton" },
      inventory: { on_hand_quantity: 3, track_inventory: true },
    },
    // Black / S / Silk does not exist
  ];

  const matrix3D = buildVariantAvailabilityMatrix(variants3D, groups3D, {
    Color: "Black",
    Size: "S",
  });

  if (matrix3D["Material"]["Cotton"]?.status === "AVAILABLE") {
    pass("3-Dimension Matrix: Cotton is AVAILABLE for Black + S");
  } else {
    fail("3-Dimension Cotton status incorrect", `Got ${matrix3D["Material"]["Cotton"]?.status}`);
  }

  if (matrix3D["Material"]["Silk"]?.status === "UNAVAILABLE") {
    pass("3-Dimension Matrix: Silk is UNAVAILABLE for Black + S");
  } else {
    fail("3-Dimension Silk status incorrect", `Got ${matrix3D["Material"]["Silk"]?.status}`);
  }
}

// ---------------------------------------------------------------------------
// SECTION 3: Real Database End-to-End Verification
// ---------------------------------------------------------------------------

async function testRealDatabaseIntegration() {
  section("REAL DATABASE INTEGRATION: Phase 5 & 6 Invariants");

  const testSlug = `verify-p5p6-${Date.now()}`;
  let createdProductId: string | null = null;

  try {
    // 1. Get or create category
    const { data: cat } = await sb
      .from("categories")
      .select("id")
      .eq("slug", "verify-p3p4-cat")
      .maybeSingle();

    let categoryId = cat?.id;
    if (!categoryId) {
      const { data: newCat } = await sb
        .from("categories")
        .insert({ name: "Verify P5P6 Cat", slug: "verify-p5p6-cat" })
        .select("id")
        .single();
      categoryId = newCat!.id;
    }

    // 2. Insert product
    const { data: prod, error: prodErr } = await sb
      .from("products")
      .insert({
        name: "Verify P5P6 Matrix T-Shirt",
        slug: testSlug,
        category_id: categoryId,
        base_price: 2500000,
        status: "published",
      })
      .select("id")
      .single();

    if (prodErr || !prod) {
      throw new Error(`Product creation failed: ${prodErr?.message}`);
    }
    createdProductId = prod.id;
    pass("Created test product in Supabase DB");

    // 3. Create Option Groups: Color & Size
    const { data: colorGroup } = await sb
      .from("option_groups")
      .insert({ product_id: createdProductId, name: "Color", display_order: 1 })
      .select("id")
      .single();

    const { data: sizeGroup } = await sb
      .from("option_groups")
      .insert({ product_id: createdProductId, name: "Size", display_order: 2 })
      .select("id")
      .single();

    await sb.from("option_values").insert([
      { option_group_id: colorGroup!.id, label: "Red", display_order: 1 },
      { option_group_id: colorGroup!.id, label: "Blue", display_order: 2 },
    ]);

    await sb.from("option_values").insert([
      { option_group_id: sizeGroup!.id, label: "Small", display_order: 1 },
      { option_group_id: sizeGroup!.id, label: "Medium", display_order: 2 },
      { option_group_id: sizeGroup!.id, label: "Large", display_order: 3 },
    ]);
    pass("Created Color [Red, Blue] and Size [Small, Medium, Large] in DB");

    // 4. Create variants with specific inventory states:
    // - Red / Small: in stock (10)
    // - Red / Medium: out of stock (0)
    // - Blue / Small: in stock (5)
    // - Blue / Large: in stock (untracked)
    // NOTE: Red / Large and Blue / Medium intentionally omitted from catalog!

    const variantsToInsert = [
      {
        product_id: createdProductId,
        sku: `${testSlug.toUpperCase()}-RED-S`,
        option_combination: { Color: "Red", Size: "Small" },
        status: "active",
        is_default: true,
      },
      {
        product_id: createdProductId,
        sku: `${testSlug.toUpperCase()}-RED-M`,
        option_combination: { Color: "Red", Size: "Medium" },
        status: "active",
        is_default: false,
      },
      {
        product_id: createdProductId,
        sku: `${testSlug.toUpperCase()}-BLU-S`,
        option_combination: { Color: "Blue", Size: "Small" },
        status: "active",
        is_default: false,
      },
      {
        product_id: createdProductId,
        sku: `${testSlug.toUpperCase()}-BLU-L`,
        option_combination: { Color: "Blue", Size: "Large" },
        status: "active",
        is_default: false,
      },
    ];

    const { data: insertedVariants, error: varErr } = await sb
      .from("product_variants")
      .insert(variantsToInsert)
      .select("id, sku, option_combination, status");

    if (varErr || !insertedVariants) {
      throw new Error(`Variant insertion failed: ${varErr?.message}`);
    }

    const redSmall = insertedVariants.find((v) => v.sku.endsWith("-RED-S"))!;
    const redMed = insertedVariants.find((v) => v.sku.endsWith("-RED-M"))!;
    const bluSmall = insertedVariants.find((v) => v.sku.endsWith("-BLU-S"))!;
    const bluLarge = insertedVariants.find((v) => v.sku.endsWith("-BLU-L"))!;

    // Update the auto-created inventory records (trigger created them with qty=0)
    await sb
      .from("inventory_records")
      .update({ on_hand_quantity: 10, reserved_quantity: 0, track_inventory: true })
      .eq("variant_id", redSmall.id);

    await sb
      .from("inventory_records")
      .update({ on_hand_quantity: 0, reserved_quantity: 0, track_inventory: true })
      .eq("variant_id", redMed.id);

    await sb
      .from("inventory_records")
      .update({ on_hand_quantity: 5, reserved_quantity: 0, track_inventory: true })
      .eq("variant_id", bluSmall.id);

    await sb
      .from("inventory_records")
      .update({ on_hand_quantity: 0, reserved_quantity: 0, track_inventory: false })
      .eq("variant_id", bluLarge.id);

    pass("Updated auto-created DB inventory records with test quantities");

    // 5. Query back via the exact query pattern used by products.ts
    const { data: fetchedVariants } = await sb
      .from("product_variants")
      .select(
        "id, product_id, sku, option_combination, price_override, is_default, status, inventory:inventory_records(id, on_hand_quantity, reserved_quantity, track_inventory, allow_backorders)"
      )
      .eq("product_id", createdProductId);

    if (!fetchedVariants || fetchedVariants.length !== 4) {
      throw new Error(`Fetched variant count mismatch: expected 4, got ${fetchedVariants?.length}`);
    }

    const groupsInput: OptionGroupInput[] = [
      { name: "Color", values: [{ label: "Red" }, { label: "Blue" }] },
      { name: "Size", values: [{ label: "Small" }, { label: "Medium" }, { label: "Large" }] },
    ];

    // Verify Resolver on real DB data
    const resolvedRedSmall = resolveVariantByCombination(
      fetchedVariants,
      { Color: "Red", Size: "Small" },
      ["Color", "Size"]
    );
    if (resolvedRedSmall?.id === redSmall.id) {
      pass("Real DB: resolveVariantByCombination resolved Red/Small to expected row");
    } else {
      fail("Real DB resolver failed for Red/Small");
    }

    const resolvedMissing = resolveVariantByCombination(
      fetchedVariants,
      { Color: "Red", Size: "Large" }, // Not generated in DB
      ["Color", "Size"]
    );
    if (resolvedMissing === null) {
      pass("Real DB: Non-existent combination (Red/Large) cleanly returned null");
    } else {
      fail("Real DB: Non-existent combination returned a variant", `Got ${resolvedMissing.id}`);
    }

    // Verify Matrix on real DB data
    const dbMatrix = buildVariantAvailabilityMatrix(fetchedVariants, groupsInput, {
      Color: "Red",
    });

    if (dbMatrix["Size"]["Small"].status === "AVAILABLE") {
      pass("Real DB Matrix: Size Small is AVAILABLE for Red");
    } else {
      fail("Real DB Matrix Small status mismatch", `Got ${dbMatrix["Size"]["Small"].status}`);
    }

    if (dbMatrix["Size"]["Medium"].status === "OUT_OF_STOCK") {
      pass("Real DB Matrix: Size Medium is OUT_OF_STOCK for Red");
    } else {
      fail("Real DB Matrix Medium status mismatch", `Got ${dbMatrix["Size"]["Medium"].status}`);
    }

    if (dbMatrix["Size"]["Large"].status === "UNAVAILABLE") {
      pass("Real DB Matrix: Size Large is UNAVAILABLE for Red");
    } else {
      fail("Real DB Matrix Large status mismatch", `Got ${dbMatrix["Size"]["Large"].status}`);
    }
  } finally {
    if (createdProductId) {
      // Clean up product and cascades
      const { data: vars } = await sb
        .from("product_variants")
        .select("id")
        .eq("product_id", createdProductId);
      if (vars && vars.length > 0) {
        await sb.from("inventory_records").delete().in("variant_id", vars.map((v) => v.id));
        await sb.from("product_variants").delete().eq("product_id", createdProductId);
      }
      const { data: grps } = await sb
        .from("option_groups")
        .select("id")
        .eq("product_id", createdProductId);
      if (grps && grps.length > 0) {
        await sb.from("option_values").delete().in("option_group_id", grps.map((g) => g.id));
        await sb.from("option_groups").delete().eq("product_id", createdProductId);
      }
      await sb.from("products").delete().eq("id", createdProductId);
      console.log("🧹 Cleaned up temporary test product and relations");
    }
  }
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function main() {
  console.log("============================================================");
  console.log("  SIVVAI LABS COMMERCE KIT — PHASE 5 & PHASE 6 VERIFICATION ");
  console.log("============================================================");

  try {
    testPhase5DomainResolver();
    testPhase6AvailabilityMatrix();
    await testRealDatabaseIntegration();
  } catch (err: any) {
    console.error("❌ Unexpected test runner error:", err);
    failed++;
  }

  console.log("\n============================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
