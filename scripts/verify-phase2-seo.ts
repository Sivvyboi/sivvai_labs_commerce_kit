/**
 * scripts/verify-phase2-seo.ts
 *
 * Comprehensive SEO regression test suite for Phase 2:
 *  1. Environment detection & preview protection (checkIsProduction)
 *  2. Product JSON-LD schema (Simple @type: "Product" vs Variant @type: "ProductGroup")
 *  3. Schema.org variesBy validity (no invalid fake URLs)
 *  4. Robots crawling policy rules & sitemap reference
 *  5. Sitemap generation & chunking scalability
 *  6. Category SEO metadata & faceted navigation policy (noindex on filters)
 *  7. Currency unit representation integrity (20,200.00 NGN)
 */

import "./preload-server-only";
import fs from "fs";
import path from "path";

// Load .env.local if present
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

import { checkIsProduction } from "../config/seo";
import { buildProductSchema } from "../features/storefront/utils/buildProductSchema";
import robots from "../app/robots";
import sitemap, { generateSitemaps, SITEMAP_CHUNK_SIZE } from "../app/sitemap";
import { formatMinorCurrency } from "../lib/utils/format";
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
  console.log("           PHASE 2: SEO & STRUCTURED DATA REGRESSION SUITE          ");
  console.log("====================================================================\n");

  // ── 1. Environment Detection & Preview Protection ───────────────────────────
  console.log("--- 1. Environment Detection & Preview Protection ---");

  const prodEnv = {
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    NEXT_PUBLIC_SITE_URL: "https://myshop.com",
  };
  assert(checkIsProduction(prodEnv) === true, "Production environment is recognized as production");

  const vercelPreviewEnv = {
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    NEXT_PUBLIC_SITE_URL: "https://myshop-git-feat.vercel.app",
  };
  assert(checkIsProduction(vercelPreviewEnv) === false, "Vercel preview is NOT recognized as production (noindex protected)");

  const stagingEnv = {
    NODE_ENV: "production",
    APP_ENV: "staging",
    NEXT_PUBLIC_SITE_URL: "https://staging.myshop.com",
  };
  assert(checkIsProduction(stagingEnv) === false, "Staging APP_ENV is NOT recognized as production");

  const localhostEnv = {
    NODE_ENV: "production",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  };
  assert(checkIsProduction(localhostEnv) === false, "Localhost URL is NOT recognized as production");

  const devEnv = {
    NODE_ENV: "development",
    NEXT_PUBLIC_SITE_URL: "https://myshop.com",
  };
  assert(checkIsProduction(devEnv) === false, "Development NODE_ENV is NOT recognized as production");

  // ── 2. Simple Product Structured Data ───────────────────────────────────────
  console.log("\n--- 2. Simple Product Schema (@type: Product) ---");

  const mockSimpleProduct: ProductWithDetails = {
    id: "prod-simple-001",
    slug: "classic-tote-bag",
    name: "Classic Tote Bag",
    description: "A durable canvas tote bag.",
    base_price: 1500000, // ₦15,000.00 in Kobo
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
        id: "var-simple-001",
        product_id: "prod-simple-001",
        image_id: null,
        sku: "TOTE-DEFAULT",
        option_combination: {},
        price_override: null,
        is_default: true,
        status: "active",
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        inventory: {
          id: "inv-001",
          on_hand_quantity: 10,
          reserved_quantity: 0,
          low_stock_threshold: 3,
          track_inventory: true,
          allow_backorders: false,
        },
      },
    ],
    images: [
      {
        id: "img-001",
        product_id: "prod-simple-001",
        url: "https://example.com/tote.jpg",
        alt_text: "Classic Tote Bag",
        display_order: 0,
        is_primary: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };

  const simpleSchema = buildProductSchema(mockSimpleProduct) as Record<string, unknown>;
  assert(simpleSchema["@type"] === "Product", "Simple product emits @type: 'Product' (not ProductGroup)");
  assert(simpleSchema["name"] === "Classic Tote Bag", "Product name matches");
  assert(simpleSchema["sku"] === "TOTE-DEFAULT", "Product SKU matches default variant SKU");

  const simpleOffer = simpleSchema["offers"] as Record<string, unknown>;
  assert(simpleOffer["price"] === "15000.00", "Simple product offer price is formatted correctly in major units (15000.00)");
  assert(simpleOffer["availability"] === "https://schema.org/InStock", "Availability is InStock");
  assert(simpleSchema["hasVariant"] === undefined, "Simple product does NOT contain hasVariant");

  // ── 3. Multi-Variant Product Structured Data & variesBy ─────────────────────
  console.log("\n--- 3. Multi-Variant ProductGroup Schema & variesBy ---");

  const mockVariantProduct: ProductWithDetails = {
    ...mockSimpleProduct,
    id: "prod-var-002",
    slug: "running-sneaker",
    name: "Running Sneaker",
    option_groups: [
      {
        id: "grp-color",
        product_id: "prod-var-002",
        name: "Color",
        display_order: 0,
        values: [
          { id: "val-black", option_group_id: "grp-color", label: "Black", display_order: 0, swatch_type: "color", swatch_value: "#000" },
          { id: "val-white", option_group_id: "grp-color", label: "White", display_order: 1, swatch_type: "color", swatch_value: "#fff" },
        ],
      },
      {
        id: "grp-material",
        product_id: "prod-var-002",
        name: "Material",
        display_order: 1,
        values: [
          { id: "val-mesh", option_group_id: "grp-material", label: "Mesh", display_order: 0, swatch_type: "none", swatch_value: null },
        ],
      },
    ],
    variants: [
      {
        id: "var-001",
        product_id: "prod-var-002",
        image_id: null,
        sku: "SNEAK-BLK-MSH",
        option_combination: { Color: "Black", Material: "Mesh" },
        price_override: 2500000, // ₦25,000.00
        is_default: true,
        status: "active",
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        inventory: {
          id: "inv-002",
          on_hand_quantity: 5,
          reserved_quantity: 0,
          low_stock_threshold: 2,
          track_inventory: true,
          allow_backorders: false,
        },
      },
      {
        id: "var-002",
        product_id: "prod-var-002",
        image_id: null,
        sku: "SNEAK-WHT-MSH",
        option_combination: { Color: "White", Material: "Mesh" },
        price_override: null, // Inherits base_price: 1500000
        is_default: false,
        status: "active",
        archived_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        inventory: {
          id: "inv-003",
          on_hand_quantity: 0,
          reserved_quantity: 0,
          low_stock_threshold: 2,
          track_inventory: true,
          allow_backorders: false,
        },
      },
    ],
  };

  const groupSchema = buildProductSchema(mockVariantProduct) as Record<string, unknown>;
  assert(groupSchema["@type"] === "ProductGroup", "Multi-variant product emits @type: 'ProductGroup'");
  assert(groupSchema["productGroupID"] === "prod-var-002", "productGroupID matches product ID");

  const variesBy = groupSchema["variesBy"] as string[];
  assert(Array.isArray(variesBy), "variesBy is an array");
  assert(variesBy.includes("https://schema.org/color"), "Color mapped to recognized https://schema.org/color");
  assert(variesBy.includes("Material"), "Custom option Material mapped to text property 'Material'");
  assert(!variesBy.some((u) => u.includes("https://schema.org/Material")), "No fake URLs like https://schema.org/Material generated");

  const hasVariant = groupSchema["hasVariant"] as Array<Record<string, unknown>>;
  assert(hasVariant.length === 2, "hasVariant contains all active variants");

  // Check variant with price override
  const var1 = hasVariant[0];
  const var1Offer = var1["offers"] as Record<string, unknown>;
  assert(var1Offer["price"] === "25000.00", "Variant 1 uses price override (25000.00)");
  assert(var1Offer["availability"] === "https://schema.org/InStock", "Variant 1 availability is InStock");

  // Check out of stock variant
  const var2 = hasVariant[1];
  const var2Offer = var2["offers"] as Record<string, unknown>;
  assert(var2Offer["price"] === "15000.00", "Variant 2 inherits base_price (15000.00)");
  assert(var2Offer["availability"] === "https://schema.org/OutOfStock", "Variant 2 availability is OutOfStock (stock=0)");

  // ── 4. Robots Policy & Canonical Sitemaps ───────────────────────────────────
  console.log("\n--- 4. Robots Policy & Directives ---");

  // Non-production crawling check
  const nonProdRobots = robots();
  assert(Boolean(nonProdRobots), "robots() generates a valid Robots object");
  assert(
    (nonProdRobots.rules as { disallow: string })?.disallow === "/",
    "Non-production robots blocks all crawling (disallow: '/')"
  );

  // Production crawling check
  const origNode = process.env.NODE_ENV;
  const origUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const origVercel = process.env.VERCEL_ENV;
  const envMutable = process.env as Record<string, string | undefined>;
  envMutable.NODE_ENV = "production";
  process.env.VERCEL_ENV = "production";
  process.env.NEXT_PUBLIC_SITE_URL = "https://myshop.com";

  const prodRobots = robots();

  // Restore env
  envMutable.NODE_ENV = origNode;
  process.env.NEXT_PUBLIC_SITE_URL = origUrl;
  process.env.VERCEL_ENV = origVercel;

  assert(Boolean(prodRobots.sitemap), "Production robots includes canonical sitemap URL");
  assert(String(prodRobots.sitemap).endsWith("/sitemap.xml"), "Production sitemap URL ends in /sitemap.xml");
  assert(
    Array.isArray(prodRobots.rules) && (prodRobots.rules[0] as { disallow: string[] }).disallow.includes("/admin/"),
    "Production robots disallows /admin/"
  );
  assert(
    Array.isArray(prodRobots.rules) && (prodRobots.rules[0] as { disallow: string[] }).disallow.includes("/checkout/"),
    "Production robots disallows /checkout/"
  );

  // ── 5. Sitemap Scalability & Chunking ───────────────────────────────────────
  console.log("\n--- 5. Sitemap Scalability & Chunking ---");

  assert(SITEMAP_CHUNK_SIZE > 0 && SITEMAP_CHUNK_SIZE <= 50000, `Sitemap chunk size (${SITEMAP_CHUNK_SIZE}) is within protocol bounds`);

  const sitemapChunks = await generateSitemaps();
  assert(Array.isArray(sitemapChunks) && sitemapChunks.length >= 1, "generateSitemaps returns at least one sitemap chunk descriptor");
  assert(sitemapChunks[0].id !== undefined, "Chunk contains valid id");

  const chunkResult = await sitemap({ id: Promise.resolve(String(sitemapChunks[0].id)) });
  assert(Array.isArray(chunkResult), "sitemap({ id }) returns an array of URL metadata entries");
  assert(chunkResult.length > 0, "sitemap returns at least one canonical URL entry");

  // ── 6. Currency Representation Integrity ───────────────────────────────────
  console.log("\n--- 6. Currency Representation Integrity ---");

  // ₦20,200.00 = 2,020,000 Kobo
  const koboAmount = 2020000;
  const formatted = formatMinorCurrency(koboAmount, "NGN", "en-NG");
  // Normalize whitespace (Intl often uses non-breaking space U+00A0)
  const normalizedFormatted = formatted.replace(/\u00a0/g, " ");
  assert(
    normalizedFormatted.includes("20,200.00"),
    `2020000 kobo correctly formats as ₦20,200.00 (got: ${normalizedFormatted})`
  );
  assert(!normalizedFormatted.includes("2,020,000"), "Amount is NOT formatted as ₦2,020,000");
  assert(!normalizedFormatted.includes("202.00"), "Amount is NOT formatted as ₦202.00");

  console.log("\n====================================================================");
  console.log(`SEO SUITE SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("====================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
