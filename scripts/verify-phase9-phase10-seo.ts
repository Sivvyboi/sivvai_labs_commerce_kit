/**
 * scripts/verify-phase9-phase10-seo.ts
 *
 * Verification Suite for:
 * - Phase 9: SEO Infrastructure & Indexability
 * - Phase 10: Product, Variant & Structured SEO
 *
 * Run from project root:
 *   npx tsx scripts/verify-phase9-phase10-seo.ts
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

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS  ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL  ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function run() {
  console.log("==================================================================");
  console.log("  SIVVAI LABS COMMERCE KIT — PHASE 9 & PHASE 10 SEO VERIFICATION  ");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // PHASE 9: SEO Infrastructure
  // -------------------------------------------------------------------------
  console.log("─────────────────────────────────────────────────────────────────");
  console.log("PHASE 9: SEO Infrastructure & Route Indexability");
  console.log("─────────────────────────────────────────────────────────────────");

  // Test 1: siteConfig URL normalization
  const { siteConfig } = await import("../config/site");
  assert(
    !siteConfig.url.endsWith("/"),
    "Test 1: siteConfig.url has no trailing slash",
    `URL is: ${siteConfig.url}`
  );

  // Test 2: SEO config exports defaultMetadata and isProduction
  const { defaultMetadata, isProduction } = await import("../config/seo");
  assert(
    defaultMetadata.title !== undefined &&
      typeof defaultMetadata.title === "object" &&
      "template" in (defaultMetadata.title as any) &&
      (defaultMetadata.title as any).template.includes("%s"),
    "Test 2: defaultMetadata has valid title template with %s"
  );

  // Test 3: robots() handler generates valid rules
  const robotsModule = await import("../app/robots");
  const robotsHandler = robotsModule.default;
  const robotsData = robotsHandler();
  assert(
    robotsData !== null && typeof robotsData === "object",
    "Test 3: robots() returns a valid Robots object"
  );

  if (isProduction) {
    const rules = Array.isArray(robotsData.rules) ? robotsData.rules[0] : robotsData.rules;
    assert(
      Array.isArray(rules?.disallow) &&
        rules.disallow.includes("/admin/") &&
        rules.disallow.includes("/checkout/"),
      "Test 4: Production robots disallows /admin/ and /checkout/",
      JSON.stringify(rules?.disallow)
    );
    assert(
      robotsData.sitemap === `${siteConfig.url}/sitemap.xml`,
      "Test 5: Production robots specifies canonical sitemap URL"
    );
  } else {
    const rules = Array.isArray(robotsData.rules) ? robotsData.rules[0] : robotsData.rules;
    assert(
      rules?.disallow === "/",
      "Test 4: Dev/Preview robots disallows all crawling (/)",
      JSON.stringify(rules)
    );
  }

  // Test 6: sitemap() generates valid list of URLs
  const sitemapModule = await import("../app/sitemap");
  const sitemapHandler = sitemapModule.default;
  const sitemapEntries = await sitemapHandler();
  assert(
    Array.isArray(sitemapEntries) && sitemapEntries.length >= 2,
    "Test 6: sitemap() returns array including home and catalog",
    `Count: ${sitemapEntries.length}`
  );

  const homeEntry = sitemapEntries.find((e) => e.url === siteConfig.url);
  const catalogEntry = sitemapEntries.find((e) => e.url === `${siteConfig.url}/catalog`);
  assert(
    homeEntry !== undefined && homeEntry.priority === 1,
    "Test 7: Sitemap includes root URL with priority 1"
  );
  assert(
    catalogEntry !== undefined && catalogEntry.priority === 0.9,
    "Test 8: Sitemap includes /catalog URL with priority 0.9"
  );

  // Test 9: Private routes are excluded from sitemap
  const hasPrivateEntry = sitemapEntries.some((e) =>
    e.url.includes("/admin") ||
    e.url.includes("/checkout") ||
    e.url.includes("/cart") ||
    e.url.includes("/auth") ||
    e.url.includes("/account")
  );
  assert(
    !hasPrivateEntry,
    "Test 9: Sitemap excludes private / transactional routes"
  );

  // Test 10: Catalog page generateMetadata
  const catalogPage = await import("../app/(storefront)/catalog/page");
  const defaultCatalogMeta = await catalogPage.generateMetadata({
    searchParams: Promise.resolve({}),
  });
  assert(
    defaultCatalogMeta.title === "All Products" &&
      !String(defaultCatalogMeta.title).includes(siteConfig.name),
    "Test 10: Catalog default metadata has clean title without double store suffix"
  );
  assert(
    defaultCatalogMeta.robots === undefined,
    "Test 11: Unfiltered catalog allows default indexability"
  );

  const filteredCatalogMeta = await catalogPage.generateMetadata({
    searchParams: Promise.resolve({ page: "2", sort: "price-asc" }),
  });
  assert(
    (filteredCatalogMeta.robots as any)?.index === false &&
      (filteredCatalogMeta.robots as any)?.follow === true,
    "Test 12: Filtered catalog sets robots: noindex, follow"
  );
  assert(
    (filteredCatalogMeta.alternates as any)?.canonical === `${siteConfig.url}/catalog`,
    "Test 13: Filtered catalog maintains clean base canonical URL"
  );

  // Test 14: Search page generateMetadata
  const searchPage = await import("../app/(storefront)/search/page");
  const searchMeta = await searchPage.generateMetadata({
    searchParams: Promise.resolve({ q: "shoes" }),
  });
  assert(
    (searchMeta.robots as any)?.index === false &&
      (searchMeta.robots as any)?.follow === true,
    "Test 14: Search results sets robots: noindex, follow"
  );
  assert(
    !String(searchMeta.title).includes(siteConfig.name),
    "Test 15: Search results title does not duplicate store name"
  );

  // Test 16: Category page generateMetadata
  const categoryPage = await import("../app/(storefront)/catalog/[category]/page");
  // Fetch an active category to test
  const { data: testCat } = await sb
    .from("categories")
    .select("slug, name")
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (testCat) {
    const catMeta = await categoryPage.generateMetadata({
      params: Promise.resolve({ category: testCat.slug }),
      searchParams: Promise.resolve({}),
    });
    assert(
      catMeta.title === testCat.name,
      "Test 16: Category page title has clean name without double store suffix",
      `Title is: "${catMeta.title}"`
    );
  } else {
    console.log("  ⚠️ SKIP  Test 16 (No categories in DB)");
  }

  // Test 17: Account, Cart, Showcase noindex metadata
  const accountLayout = await import("../app/(storefront)/account/layout");
  assert(
    (accountLayout.metadata?.robots as any)?.index === false &&
      (accountLayout.metadata?.robots as any)?.follow === false,
    "Test 17: Account layout enforces robots: noindex, nofollow"
  );

  const cartPage = await import("../app/(storefront)/cart/page");
  assert(
    (cartPage.metadata?.robots as any)?.index === false &&
      (cartPage.metadata?.robots as any)?.follow === false,
    "Test 18: Cart page enforces robots: noindex, nofollow"
  );

  const showcaseLayout = await import("../app/showcase/layout");
  assert(
    (showcaseLayout.metadata?.robots as any)?.index === false &&
      (showcaseLayout.metadata?.robots as any)?.follow === false,
    "Test 19: Showcase layout enforces robots: noindex, nofollow"
  );

  // -------------------------------------------------------------------------
  // PHASE 10: Product, Variant & Structured SEO
  // -------------------------------------------------------------------------
  console.log("\n─────────────────────────────────────────────────────────────────");
  console.log("PHASE 10: Product, Variant & Structured SEO");
  console.log("─────────────────────────────────────────────────────────────────");

  // Test 20: Breadcrumb Schema Builder
  const { buildBreadcrumbSchema } = await import(
    "../features/storefront/utils/buildBreadcrumbSchema"
  );
  const breadcrumbData = buildBreadcrumbSchema([
    { label: "Home", href: "/" },
    { label: "Catalog", href: "/catalog" },
    { label: "T-Shirt" },
  ]);
  assert(
    breadcrumbData["@type"] === "BreadcrumbList" &&
      breadcrumbData.itemListElement.length === 3 &&
      breadcrumbData.itemListElement[0].position === 1 &&
      breadcrumbData.itemListElement[0].item === `${siteConfig.url}/` &&
      breadcrumbData.itemListElement[2].item === undefined,
    "Test 20: buildBreadcrumbSchema creates valid Schema.org BreadcrumbList"
  );

  // Test 21: Multi-variant Product Schema Builder
  const { buildProductSchema } = await import(
    "../features/storefront/utils/buildProductSchema"
  );

  const mockProduct: any = {
    id: "prod-mock-uuid-1",
    slug: "classic-oxford-shirt",
    name: "Classic Oxford Shirt",
    description: "Tailored premium cotton oxford shirt.",
    base_price: 2500000,
    sale_price: 2200000,
    status: "published",
    archived_at: null,
    images: [
      { id: "img-1", url: "https://cdn.example.com/red.jpg", is_primary: true },
      { id: "img-2", url: "https://cdn.example.com/blue.jpg", is_primary: false },
    ],
    option_groups: [
      { id: "og-1", name: "Color" },
      { id: "og-2", name: "Size" },
    ],
    variants: [
      {
        id: "var-1",
        product_id: "prod-mock-uuid-1",
        sku: "OXF-RED-M",
        image_id: "img-1",
        option_combination: { Color: "Red", Size: "M" },
        price_override: null, // Inherits product.sale_price = 2200000
        is_default: true,
        status: "active",
        archived_at: null,
        inventory: {
          id: "inv-1",
          on_hand_quantity: 10,
          reserved_quantity: 2,
          track_inventory: true,
          allow_backorders: false,
        },
      },
      {
        id: "var-2",
        product_id: "prod-mock-uuid-1",
        sku: "OXF-BLU-L",
        image_id: "img-2",
        option_combination: { Color: "Blue", Size: "L" },
        price_override: 2800000, // Explicit price override
        is_default: false,
        status: "active",
        archived_at: null,
        inventory: {
          id: "inv-2",
          on_hand_quantity: 0,
          reserved_quantity: 0,
          track_inventory: true,
          allow_backorders: false,
        },
      },
      {
        id: "var-3-archived",
        product_id: "prod-mock-uuid-1",
        sku: "OXF-BLK-XL",
        option_combination: { Color: "Black", Size: "XL" },
        status: "inactive",
        archived_at: new Date().toISOString(),
      },
    ],
  };

  const productGroupSchema: any = buildProductSchema(mockProduct);

  assert(
    productGroupSchema["@type"] === "ProductGroup",
    "Test 21: buildProductSchema returns @type ProductGroup for multi-variant products"
  );
  assert(
    productGroupSchema.productGroupID === "prod-mock-uuid-1",
    "Test 22: productGroupID matches product id"
  );
  assert(
    Array.isArray(productGroupSchema.variesBy) &&
      productGroupSchema.variesBy.includes("https://schema.org/color") &&
      productGroupSchema.variesBy.includes("https://schema.org/size"),
    "Test 23: variesBy correctly maps color and size to schema.org URLs"
  );
  assert(
    Array.isArray(productGroupSchema.hasVariant) &&
      productGroupSchema.hasVariant.length === 2,
    "Test 24: hasVariant only includes the 2 active variants (excludes archived/inactive)"
  );

  const redVariant = productGroupSchema.hasVariant[0];
  const blueVariant = productGroupSchema.hasVariant[1];

  const redImg = Array.isArray(redVariant.image) ? redVariant.image[0] : redVariant.image;
  const blueImg = Array.isArray(blueVariant.image) ? blueVariant.image[0] : blueVariant.image;

  assert(
    redVariant.name === "Classic Oxford Shirt – Red / M" &&
      redImg === "https://cdn.example.com/red.jpg" &&
      redVariant.offers.price === "22000.00" &&
      redVariant.offers.availability === "https://schema.org/InStock",
    "Test 25: Active variant 1 resolves sale price, image, and InStock status"
  );

  assert(
    blueVariant.name === "Classic Oxford Shirt – Blue / L" &&
      blueImg === "https://cdn.example.com/blue.jpg" &&
      blueVariant.offers.price === "28000.00" &&
      blueVariant.offers.availability === "https://schema.org/OutOfStock",
    "Test 26: Active variant 2 resolves override price, image, and OutOfStock status"
  );

  // Test 27: PDP generateMetadata clean title and variant image
  const pdpPage = await import("../app/(storefront)/products/[slug]/page");
  // Look up a live product in DB
  const { data: liveProduct } = await sb
    .from("products")
    .select("slug, name, seo_title")
    .eq("status", "published")
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (liveProduct) {
    const pdpMeta = await pdpPage.generateMetadata({
      params: Promise.resolve({ slug: liveProduct.slug }),
      searchParams: Promise.resolve({}),
    });
    assert(
      pdpMeta.title === (liveProduct.seo_title || liveProduct.name) &&
        !String(pdpMeta.title).includes(siteConfig.name),
      "Test 27: PDP metadata title does not duplicate store name suffix",
      `Title: "${pdpMeta.title}"`
    );
    assert(
      (pdpMeta.alternates as any)?.canonical === `${siteConfig.url}/products/${liveProduct.slug}`,
      "Test 28: PDP canonical URL is authoritative base slug"
    );
  } else {
    console.log("  ⚠️ SKIP  Test 27, 28 (No published products in DB)");
  }

  // Summary
  console.log("\n==================================================================");
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Verification suite failed unexpectedly:", err);
  process.exit(1);
});
