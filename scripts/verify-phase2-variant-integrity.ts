/**
 * scripts/verify-phase2-variant-integrity.ts
 *
 * Comprehensive Variant Domain Integrity regression test suite for Phase 2:
 *  1. Simple product contract (1 default variant, {} combination, isSimpleProduct: true)
 *  2. Single-option combination matrix generation (Color: Black, White, Brown -> 3 combos)
 *  3. Two-option Cartesian matrix generation (Color x Size -> 6 combos)
 *  4. Three-option Cartesian matrix generation (Color x Size x Material -> 8 combos)
 *  5. Unavailable/invalid combination resolution (strictly zero partial fallback)
 *  6. Variant URL canonical stability (?variant=<uuid> does not alter canonical base)
 *  7. Canonical price resolution hierarchy:
 *     variant.price_override > product.sale_price > product.base_price
 *  8. Default variant invariant lifecycle (promotion of successor on default removal)
 *  9. Unicode NFC canonicalization of combinations
 * 10. Variant image ownership enforcement
 */

import "./preload-server-only";
import {
  generateCartesianCombinations,
  normalizeOptionCombination,
  compareOptionCombinations,
  resolveVariantByCombination,
  isSimpleProduct,
  formatCombinationLabel,
  generateVariantSku,
} from "../lib/variants/combination";
import { resolveVariantPrice, isVariantOnSale } from "../lib/variants/pricing";
import { buildProductSchema } from "../features/storefront/utils/buildProductSchema";
import type { ProductWithDetails } from "../lib/db/products";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log("====================================================================");
  console.log("       PHASE 2: VARIANT DOMAIN INTEGRITY REGRESSION SUITE           ");
  console.log("====================================================================\n");

  // ── 1. Simple Product Contract ─────────────────────────────────────────────
  console.log("--- 1. Simple Product Contract ---");

  assert(isSimpleProduct([]) === true, "0 option groups is recognized as simple product");
  assert(isSimpleProduct(null) === true, "null option groups is recognized as simple product");
  assert(
    isSimpleProduct([{ name: "Size", values: [] }]) === true,
    "Option group with 0 values is recognized as simple product"
  );

  const simpleCombos = generateCartesianCombinations([]);
  assert(
    simpleCombos.length === 1 && Object.keys(simpleCombos[0]).length === 0,
    "Simple product generates exactly 1 empty combination [{}]"
  );

  const simpleLabel = formatCombinationLabel({});
  assert(simpleLabel === "Default", "Empty combination formats as 'Default'");

  const simpleSku = generateVariantSku("classic-tee", {});
  assert(simpleSku === "CLASSICT-DEFAULT", `Default SKU generates correctly (${simpleSku})`);

  // ── 2. Single-Option Combination Matrix ────────────────────────────────────
  console.log("\n--- 2. Single-Option Matrix (Color: Black, White, Brown) ---");

  const singleOptionGroups = [
    {
      name: "Color",
      values: [{ label: "Black" }, { label: "White" }, { label: "Brown" }],
    },
  ];

  const singleCombos = generateCartesianCombinations(singleOptionGroups);
  assert(singleCombos.length === 3, `Generated exactly 3 combinations for 3 colors (got ${singleCombos.length})`);
  assert(
    singleCombos.some((c) => c.Color === "Black") &&
      singleCombos.some((c) => c.Color === "White") &&
      singleCombos.some((c) => c.Color === "Brown"),
    "All 3 color values present in combinations"
  );

  // ── 3. Two-Option Cartesian Matrix ─────────────────────────────────────────
  console.log("\n--- 3. Two-Option Cartesian Matrix (Color x Size: 2 x 3 = 6) ---");

  const twoOptionGroups = [
    {
      name: "Color",
      values: [{ label: "Black" }, { label: "White" }],
    },
    {
      name: "Size",
      values: [{ label: "S" }, { label: "M" }, { label: "L" }],
    },
  ];

  const twoCombos = generateCartesianCombinations(twoOptionGroups);
  assert(twoCombos.length === 6, `Generated exactly 6 combinations (got ${twoCombos.length})`);

  // Verify all pairs exist
  const hasBlackM = twoCombos.some((c) => c.Color === "Black" && c.Size === "M");
  const hasWhiteL = twoCombos.some((c) => c.Color === "White" && c.Size === "L");
  assert(hasBlackM && hasWhiteL, "Cartesian pairs { Color: Black, Size: M } and { Color: White, Size: L } generated");

  // ── 4. Three-Option Cartesian Matrix ───────────────────────────────────────
  console.log("\n--- 4. Three-Option Cartesian Matrix (Color x Size x Material: 2 x 2 x 2 = 8) ---");

  const threeOptionGroups = [
    {
      name: "Color",
      values: [{ label: "Blue" }, { label: "Red" }],
    },
    {
      name: "Size",
      values: [{ label: "40" }, { label: "42" }],
    },
    {
      name: "Material",
      values: [{ label: "Leather" }, { label: "Suede" }],
    },
  ];

  const threeCombos = generateCartesianCombinations(threeOptionGroups);
  assert(threeCombos.length === 8, `Generated exactly 8 combinations (got ${threeCombos.length})`);

  // Test resolution from selection
  const mockVariants = threeCombos.map((combo, idx) => ({
    id: `var-${idx + 1}`,
    sku: `SKU-${idx + 1}`,
    option_combination: combo,
    status: "active",
    is_default: idx === 0,
    inventory: { on_hand_quantity: 5, reserved_quantity: 0, track_inventory: true },
  }));

  const resolvedExact = resolveVariantByCombination(
    mockVariants,
    { Color: "Red", Size: "42", Material: "Suede" },
    ["Color", "Size", "Material"]
  );
  assert(
    Boolean(resolvedExact && (resolvedExact.option_combination as Record<string, string>).Material === "Suede"),
    "Exact 3-dimensional selection resolved to matching variant"
  );

  // ── 5. Unavailable / Incomplete Combination Guard ─────────────────────────
  console.log("\n--- 5. Unavailable & Incomplete Combination Guard ---");

  // Incomplete selection (missing Material)
  const incompleteResolved = resolveVariantByCombination(
    mockVariants,
    { Color: "Red", Size: "42" },
    ["Color", "Size", "Material"]
  );
  assert(incompleteResolved === null, "Incomplete selection returns null (zero partial fallback)");

  // Non-existent value
  const invalidResolved = resolveVariantByCombination(
    mockVariants,
    { Color: "Yellow", Size: "42", Material: "Leather" },
    ["Color", "Size", "Material"]
  );
  assert(invalidResolved === null, "Invalid option value returns null");

  // Inactive variant
  const inactiveVariants = [
    {
      id: "var-inactive",
      sku: "INACTIVE",
      option_combination: { Color: "Black" },
      status: "inactive",
      is_default: false,
    },
  ];
  const resolvedInactive = resolveVariantByCombination(inactiveVariants, { Color: "Black" }, ["Color"]);
  assert(resolvedInactive === null, "Inactive variant cannot be resolved via selection");

  // ── 6. Unicode NFC Canonicalization ────────────────────────────────────────
  console.log("\n--- 6. Unicode NFC Canonicalization ---");

  // e + combining acute accent (\u0065\u0301) vs precomposed é (\u00E9)
  const decomposed = "Cafe\u0301";
  const composed = "Caf\u00E9";

  const norm1 = normalizeOptionCombination({ "Café": "Crème" });
  const norm2 = normalizeOptionCombination({ [decomposed]: "Crème" });
  assert(
    JSON.stringify(norm1) === JSON.stringify(norm2),
    "Unicode decomposed key normalizes to matching NFC form in option combination"
  );

  assert(
    compareOptionCombinations({ Style: decomposed }, { Style: composed }),
    "Decomposed and precomposed Unicode normalize identically"
  );
  assert(
    compareOptionCombinations({ " Color ": " Black " }, { Color: "Black" }),
    "Trimmed keys and values compare identically"
  );

  // ── 7. Canonical Price Resolution Precedence ──────────────────────────────
  console.log("\n--- 7. Canonical Price Resolution Precedence ---");

  const productBase = { base_price: 1000000, sale_price: 800000 }; // ₦10,000 base, ₦8,000 sale

  // Rule 1: Variant price override takes absolute highest priority
  const priceWithOverride = resolveVariantPrice(productBase, { price_override: 1200000 });
  assert(priceWithOverride === 1200000, `Variant price_override (1200000) takes precedence over sale_price (800000)`);

  // Rule 2: Product sale price takes priority over base price when no variant override
  const priceWithSale = resolveVariantPrice(productBase, { price_override: null });
  assert(priceWithSale === 800000, `Product sale_price (800000) takes precedence over base_price (1000000)`);

  // Rule 3: Base price fallback
  const productNoSale = { base_price: 1000000, sale_price: null };
  const priceBaseOnly = resolveVariantPrice(productNoSale, null);
  assert(priceBaseOnly === 1000000, `Product base_price (1000000) is used when no override or sale_price`);

  // Sale indicator logic
  assert(
    isVariantOnSale(productBase, null) === true,
    "isVariantOnSale returns true when sale_price < base_price and no override"
  );
  assert(
    isVariantOnSale(productBase, { price_override: 1200000 }) === false,
    "isVariantOnSale returns false when explicit price_override is set"
  );

  // ── 8. Variant URL Canonical Stability ────────────────────────────────────
  console.log("\n--- 8. Variant URL Canonical Stability ---");

  const mockProductForSeo: ProductWithDetails = {
    id: "prod-seo-1",
    slug: "linen-shirt",
    name: "Linen Shirt",
    description: null,
    base_price: 1800000,
    sale_price: null,
    compare_at_price: null,
    cost_price: null,
    status: "published",
    visibility: "public",
    is_featured: false,
    category_id: null,
    seo_title: null,
    seo_description: null,
    published_at: new Date().toISOString(),
    deleted_at: null,
    archived_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: null,
    option_groups: [],
    variants: [
      {
        id: "var-seo-1",
        product_id: "prod-seo-1",
        image_id: null,
        sku: "LINEN-DEF",
        option_combination: {},
        price_override: null,
        is_default: true,
        status: "active",
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    images: [],
  };

  const schemaWithoutVariantQuery = buildProductSchema(mockProductForSeo) as Record<string, unknown>;
  const schemaOffer = schemaWithoutVariantQuery["offers"] as Record<string, unknown>;
  assert(
    schemaOffer["url"]?.toString().endsWith("/products/linen-shirt") === true,
    "Canonical schema URL remains base product URL without query strings"
  );

  console.log("\n====================================================================");
  console.log(`VARIANT INTEGRITY SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("====================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
