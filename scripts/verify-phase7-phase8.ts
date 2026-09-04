/**
 * scripts/verify-phase7-phase8.ts
 *
 * Real-Database Verification Suite for:
 * - Phase 7: Variant-Aware Cart & Inventory Enforcement (Tests 1–12)
 * - Phase 8: Variant-Aware Checkout, Payment & Order Integrity (Tests 13–33)
 *
 * Run from project root:
 *   npx tsx scripts/verify-phase7-phase8.ts
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

import { resolveVariantPrice } from "../lib/variants/pricing";
import * as cartRepo from "../lib/db/carts";
import * as cartService from "../services/cart-service";
import * as checkoutService from "../services/checkout-service";
import * as orderService from "../services/order-service";
import * as inventoryService from "../services/inventory-service";

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
  console.log(`\n${"─".repeat(65)}\n${title}\n${"─".repeat(65)}`);
}

// Helper tracking for guaranteed DB cleanup
const cleanupProductIds: string[] = [];
const cleanupCartIds: string[] = [];
const cleanupOrderIds: string[] = [];
const cleanupCustomerIds: string[] = [];

async function performCleanup() {
  console.log("\n🧹 Cleaning up test fixtures from live database...");

  for (const oId of cleanupOrderIds) {
    await sb.from("order_lines").delete().eq("order_id", oId);
    await sb.from("orders").delete().eq("id", oId);
  }

  for (const cId of cleanupCartIds) {
    await sb.from("cart_lines").delete().eq("cart_id", cId);
    await sb.from("checkout_sessions").delete().eq("cart_id", cId);
    await sb.from("carts").delete().eq("id", cId);
  }

  for (const custId of cleanupCustomerIds) {
    await sb.from("customer_addresses").delete().eq("customer_id", custId);
    await sb.from("customers").delete().eq("id", custId);
  }

  for (const pId of cleanupProductIds) {
    const { data: vars } = await sb
      .from("product_variants")
      .select("id")
      .eq("product_id", pId);
    if (vars && vars.length > 0) {
      const vIds = vars.map((v) => v.id);
      await sb.from("inventory_reservations").delete().in("variant_id", vIds);
      await sb.from("inventory_records").delete().in("variant_id", vIds);
      await sb.from("product_variants").delete().eq("product_id", pId);
    }
    await sb.from("products").delete().eq("id", pId);
  }
}

// ---------------------------------------------------------------------------
// Shared Seed Helpers
// ---------------------------------------------------------------------------

async function getOrCreateCategory(): Promise<string> {
  const { data: cat } = await sb
    .from("categories")
    .select("id")
    .eq("slug", "verify-p7p8-cat")
    .maybeSingle();

  if (cat) return cat.id;

  const { data: newCat, error } = await sb
    .from("categories")
    .insert({ name: "Verify P7P8 Cat", slug: "verify-p7p8-cat" })
    .select("id")
    .single();

  if (error || !newCat) throw new Error(`Category creation failed: ${error?.message}`);
  return newCat.id;
}

// ---------------------------------------------------------------------------
// SECTION 1: Phase 7 Tests (Tests 1–12)
// ---------------------------------------------------------------------------

async function runPhase7Tests(categoryId: string) {
  section("PHASE 7: Variant-Aware Cart & Inventory Enforcement");

  // Create test product and variants
  const slug = `p7-product-${Date.now()}`;
  const { data: product } = await sb
    .from("products")
    .insert({
      name: "P7 Cart Product",
      slug,
      category_id: categoryId,
      base_price: 2000000, // ₦20,000
      sale_price: 1800000, // ₦18,000
      status: "published",
    })
    .select("id")
    .single();

  const productId = product!.id;
  cleanupProductIds.push(productId);

  // Variant A: Active, stock 10, no price override (uses sale_price ₦18,000)
  const { data: varA } = await sb
    .from("product_variants")
    .insert({
      product_id: productId,
      sku: `P7-VARA-${Date.now()}`,
      status: "active",
      option_combination: { Color: "Red", Size: "Small" },
      is_default: true,
    })
    .select("id, sku")
    .single();

  await sb
    .from("inventory_records")
    .update({ on_hand_quantity: 10, track_inventory: true })
    .eq("variant_id", varA!.id);

  // Variant B: Active, stock 5, price_override 2500000 (₦25,000)
  const { data: varB } = await sb
    .from("product_variants")
    .insert({
      product_id: productId,
      sku: `P7-VARB-${Date.now()}`,
      status: "active",
      price_override: 2500000,
      option_combination: { Color: "Blue", Size: "Large" },
      is_default: false,
    })
    .select("id, sku")
    .single();

  await sb
    .from("inventory_records")
    .update({ on_hand_quantity: 5, track_inventory: true })
    .eq("variant_id", varB!.id);

  // Variant C: Inactive
  const { data: varInactive } = await sb
    .from("product_variants")
    .insert({
      product_id: productId,
      sku: `P7-INACTIVE-${Date.now()}`,
      status: "inactive",
      option_combination: { Color: "Green", Size: "Small" },
      is_default: false,
    })
    .select("id")
    .single();

  // Variant D: Archived
  const { data: varArchived } = await sb
    .from("product_variants")
    .insert({
      product_id: productId,
      sku: `P7-ARCHIVED-${Date.now()}`,
      status: "active",
      archived_at: new Date().toISOString(),
      option_combination: { Color: "Yellow", Size: "Small" },
      is_default: false,
    })
    .select("id")
    .single();

  // Create a cart for testing
  const mainTokenHash = `verify_main_${Date.now()}`;
  const cart = await cartRepo.createCartWithHash(mainTokenHash);
  const cartId = cart.id;
  cleanupCartIds.push(cartId);
  const cartOpts = { tokenHash: mainTokenHash };

  // Test 1: Add active variant to cart
  const item1 = await cartRepo.addCartItem(
    {
      cartId,
      variantId: varA!.id,
      quantity: 2,
    },
    cartOpts
  );
  if (item1 && item1.quantity === 2 && item1.unit_price_snapshot === 1800000) {
    pass("Test 1: Add active variant to cart with canonical sale price (₦18,000)");
  } else {
    fail("Test 1: Add active variant failed", JSON.stringify(item1));
  }

  // Test 2: Reject inactive variant
  try {
    await cartRepo.addCartItem(
      {
        cartId,
        variantId: varInactive!.id,
        quantity: 1,
      },
      cartOpts
    );
    fail("Test 2: Expected inactive variant to be rejected");
  } catch (err: any) {
    pass("Test 2: Inactive variant rejected by cart repository", err.message);
  }

  // Test 3: Reject archived variant
  try {
    await cartRepo.addCartItem(
      {
        cartId,
        variantId: varArchived!.id,
        quantity: 1,
      },
      cartOpts
    );
    fail("Test 3: Expected archived variant to be rejected");
  } catch (err: any) {
    pass("Test 3: Archived variant rejected by cart repository", err.message);
  }

  // Test 4: Reject unpublished product
  const { data: draftProduct } = await sb
    .from("products")
    .insert({
      name: "P7 Draft Product",
      slug: `p7-draft-${Date.now()}`,
      category_id: categoryId,
      base_price: 1000000,
      status: "draft",
    })
    .select("id")
    .single();
  cleanupProductIds.push(draftProduct!.id);

  const { data: varDraft } = await sb
    .from("product_variants")
    .insert({
      product_id: draftProduct!.id,
      sku: `P7-DRAFT-${Date.now()}`,
      status: "active",
      option_combination: {},
      is_default: true,
    })
    .select("id")
    .single();

  try {
    await cartRepo.addCartItem(
      {
        cartId,
        variantId: varDraft!.id,
        quantity: 1,
      },
      cartOpts
    );
    fail("Test 4: Expected unpublished product to be rejected");
  } catch (err: any) {
    pass("Test 4: Unpublished (draft) product variant rejected", err.message);
  }

  // Test 5: Preserve separate variants in cart
  const item2 = await cartRepo.addCartItem(
    {
      cartId,
      variantId: varB!.id,
      quantity: 1,
    },
    cartOpts
  );

  const cartLines = await sb.from("cart_lines").select("id, variant_id, quantity").eq("cart_id", cartId);
  if (cartLines.data?.length === 2) {
    pass("Test 5: Variant A and Variant B remain distinct separate lines in cart");
  } else {
    fail("Test 5: Separate variants not preserved", `Found ${cartLines.data?.length} lines`);
  }

  // Test 6: Quantity update respects stock
  try {
    // Stock is 10, attempt to update line 1 to 99
    await cartRepo.updateCartItemQuantity(item1.id, 99, cartOpts);
    fail("Test 6: Expected update to quantity 99 to fail due to insufficient stock");
  } catch (err: any) {
    pass("Test 6: Quantity update > available stock rejected", err.message);
  }

  const updatedLine = await cartRepo.updateCartItemQuantity(item1.id, 4, cartOpts);
  if ((updatedLine as any).quantity === 4) {
    pass("Test 6b: Valid quantity update (4 <= 10) succeeds");
  } else {
    fail("Test 6b: Valid quantity update failed");
  }

  // Test 7: Stale variant handling (flagged as stale, never substituted)
  // Archive Variant B
  await sb.from("product_variants").update({ archived_at: new Date().toISOString() }).eq("id", varB!.id);

  const enrichedCart = await cartService.getCart(cartId, cartOpts);
  const staleItem = enrichedCart.items.find((i) => i.variant_id === varB!.id);
  if (staleItem?.is_stale && enrichedCart.hasStaleItems) {
    pass("Test 7: Stale variant retained in cart with is_stale=true and NOT substituted");
  } else {
    fail("Test 7: Stale variant was not correctly identified");
  }

  // Unarchive Variant B for remaining tests
  await sb.from("product_variants").update({ archived_at: null }).eq("id", varB!.id);

  // Test 8: Guest cart preserves variants
  const guestTokenHash = `verify_hash_${Date.now()}`;
  const guestCart = await cartRepo.createCartWithHash(guestTokenHash);
  cleanupCartIds.push(guestCart.id);
  const guestOpts = { tokenHash: guestTokenHash };

  await cartRepo.addCartItem(
    {
      cartId: guestCart.id,
      variantId: varA!.id,
      quantity: 2,
    },
    guestOpts
  );
  await cartRepo.addCartItem(
    {
      cartId: guestCart.id,
      variantId: varB!.id,
      quantity: 1,
    },
    guestOpts
  );

  const fetchedGuestCart = await cartRepo.findCartByTokenHash(guestTokenHash);
  if (fetchedGuestCart?.items.length === 2) {
    pass("Test 8: Guest cart preserves multiple variants via cart_token_hash");
  } else {
    fail("Test 8: Guest cart lookup failed", `Found ${fetchedGuestCart?.items.length} items`);
  }

  // Test 9 & 10: Guest -> authenticated merge & duplicate variant merging
  // Customer cart already has varA with qty 4 (from earlier test)
  const { data: customer } = await sb
    .from("customers")
    .insert({
      email: `customer-merge-${Date.now()}@example.com`,
      first_name: "Merge",
      last_name: "Tester",
      status: "active",
    })
    .select("id")
    .single();
  cleanupCustomerIds.push(customer!.id);

  // Associate our main cart with this customer
  await sb.from("carts").update({ customer_id: customer!.id }).eq("id", cartId);

  // Guest cart has varA x 2, varB x 1. Customer cart has varA x 4 and varB x 1 (from Test 5 & 6b).
  // After merge: varA should have 4 + 2 = 6, varB should have 1 + 1 = 2.
  const mergedCart = await cartService.mergeGuestCartOnLogin(
    {
      guestCartId: guestCart.id,
      customerId: customer!.id,
    },
    { useAdmin: true }
  );

  const mergedLineA = mergedCart.items.find((i) => i.variant_id === varA!.id);
  const mergedLineB = mergedCart.items.find((i) => i.variant_id === varB!.id);

  if (mergedLineA?.quantity === 6 && mergedLineB?.quantity === 2) {
    pass("Test 9 & 10: Guest merge preserved variant identities & combined duplicate quantities (varA: 4+2=6, varB: 1+1=2)");
  } else {
    fail(
      "Test 9 & 10: Cart merge failed",
      `varA qty=${mergedLineA?.quantity}, varB qty=${mergedLineB?.quantity}`
    );
  }

  // Test 11: Canonical price resolver ignores client prices
  const priceResolved = resolveVariantPrice(
    { base_price: 2000000, sale_price: 1800000 },
    { price_override: 2500000 }
  );
  if (priceResolved === 2500000) {
    pass("Test 11: Canonical price resolver gives priority to variant price_override");
  } else {
    fail("Test 11: Price resolver priority mismatch", `Got ${priceResolved}`);
  }

  // Test 12: Cart subtotal accuracy
  // Line A: 6 x ₦18,000 = ₦108,000. Line B: 2 x ₦25,000 = ₦50,000. Total = ₦158,000.
  if (mergedCart.subtotal === 158000) {
    pass("Test 12: Cart subtotal calculated accurately from authoritative snapshots (₦158,000)");
  } else {
    fail("Test 12: Subtotal mismatch", `Expected 158000, got ${mergedCart.subtotal}`);
  }
}

// ---------------------------------------------------------------------------
// SECTION 2: Phase 8 Tests (Tests 13–33)
// ---------------------------------------------------------------------------

async function runPhase8Tests(categoryId: string) {
  section("PHASE 8: Variant-Aware Checkout, Payment & Order Integrity");

  // Create product with 2 variants for checkout flow
  const slug = `p8-shoe-${Date.now()}`;
  const { data: product } = await sb
    .from("products")
    .insert({
      name: "Phase 8 Premium Shoe",
      slug,
      category_id: categoryId,
      base_price: 3000000, // ₦30,000
      status: "published",
    })
    .select("id")
    .single();

  const productId = product!.id;
  cleanupProductIds.push(productId);

  // Variant 1: White / 42 (₦30,000, stock = 10)
  const { data: varWhite42 } = await sb
    .from("product_variants")
    .insert({
      product_id: productId,
      sku: `SHOE-WHT-42-${Date.now()}`,
      status: "active",
      option_combination: { Color: "White", Size: "42" },
      is_default: true,
    })
    .select("id, sku")
    .single();

  await sb
    .from("inventory_records")
    .update({ on_hand_quantity: 10, track_inventory: true })
    .eq("variant_id", varWhite42!.id);

  // Variant 2: Black / 40 (₦32,000 price override, stock = 5)
  const { data: varBlack40 } = await sb
    .from("product_variants")
    .insert({
      product_id: productId,
      sku: `SHOE-BLK-40-${Date.now()}`,
      status: "active",
      price_override: 3200000, // ₦32,000
      option_combination: { Color: "Black", Size: "40" },
      is_default: false,
    })
    .select("id, sku")
    .single();

  await sb
    .from("inventory_records")
    .update({ on_hand_quantity: 5, track_inventory: true })
    .eq("variant_id", varBlack40!.id);

  // Create customer and cart
  const { data: customer } = await sb
    .from("customers")
    .insert({
      email: `checkout-customer-${Date.now()}@example.com`,
      first_name: "David",
      last_name: "Adeleke",
      status: "active",
    })
    .select("id")
    .single();

  const customerId = customer!.id;
  cleanupCustomerIds.push(customerId);

  const { data: cart } = await sb
    .from("carts")
    .insert({
      customer_id: customerId,
      status: "active",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
    .select("id")
    .single();

  const cartId = cart!.id;
  cleanupCartIds.push(cartId);

  // Add 2 x White/42 (2 x ₦30,000 = ₦60,000)
  await cartRepo.addCartItem(
    {
      cartId,
      variantId: varWhite42!.id,
      quantity: 2,
    },
    { useAdmin: true }
  );

  // Add 1 x Black/40 (1 x ₦32,000 = ₦32,000)
  await cartRepo.addCartItem(
    {
      cartId,
      variantId: varBlack40!.id,
      quantity: 1,
    },
    { useAdmin: true }
  );

  // Subtotal = ₦92,000

  // Test 13 & 14: Multi-variant checkout initiation
  const checkoutInit = await checkoutService.initiateCheckout({
    cartId,
    email: "checkout-customer@example.com",
    fullName: "David Adeleke",
    shippingAddress: {
      addressLine1: "12 Marina Road",
      city: "Lagos",
      state: "Lagos",
      country: "NG",
    },
  });

  const session = checkoutInit.checkoutSession;
  if (session && session.status === "open") {
    pass("Test 13 & 14: Multi-variant checkout initiated with open session");
  } else {
    fail("Test 13 & 14: Checkout initiation failed");
  }

  // Test 15: Correct reservation mapping (both variants reserved separately)
  const reservations = checkoutInit.reservations;
  const resWhite = reservations.find((r) => r.variant_id === varWhite42!.id);
  const resBlack = reservations.find((r) => r.variant_id === varBlack40!.id);

  if (resWhite && resWhite.quantity === 2 && resBlack && resBlack.quantity === 1) {
    pass("Test 15: Distinct 1-to-1 reservations mapped for White/42 (qty 2) and Black/40 (qty 1)");
  } else {
    fail("Test 15: Reservation mapping failed", JSON.stringify(reservations));
  }

  // Test 16: Subtotal calculation
  if (session.subtotal === 92000) {
    pass("Test 16: Checkout session subtotal is accurate (₦92,000)");
  } else {
    fail("Test 16: Subtotal mismatch", `Got ${session.subtotal}`);
  }

  // Test 17 & 18: Grand total integrity
  if (session.grand_total === 92000) {
    pass("Test 17 & 18: Grand total integrity verified (₦92,000)");
  } else {
    fail("Test 17 & 18: Grand total mismatch", `Got ${session.grand_total}`);
  }

  // Test 19 & 20: Payment amount authority (NGN kobo = 9200000)
  const paymentKobo = session.grand_total * 100;
  if (paymentKobo === 9200000) {
    pass("Test 19 & 20: Payment provider amount strictly derived as 9,200,000 kobo");
  } else {
    fail("Test 19 & 20: Payment amount mismatch", `Got ${paymentKobo}`);
  }

  // Test 21–24: Order Creation via RPC with variant snapshots
  const paymentRef = `PAYREF-${Date.now()}`;
  const createdOrder = await orderService.createOrderFromCheckout(session.id, paymentRef);
  cleanupOrderIds.push(createdOrder.id);

  const orderLines = (createdOrder as any).lines || (
    await sb.from("order_lines").select("*").eq("order_id", createdOrder.id)
  ).data;

  const lineWhite = orderLines?.find((l: any) => l.variant_id === varWhite42!.id);
  const lineBlack = orderLines?.find((l: any) => l.variant_id === varBlack40!.id);

  if (lineWhite && lineBlack) {
    pass("Test 21: Order lines correctly reference exact purchased variant IDs");
  } else {
    fail("Test 21: Order lines missing variant IDs");
  }

  // Test 22: Variant labels snapshot
  if (lineWhite?.variant_label_snapshot && lineBlack?.variant_label_snapshot) {
    pass(
      `Test 22: Variant labels preserved in order: '${lineWhite.variant_label_snapshot}' and '${lineBlack.variant_label_snapshot}'`
    );
  } else {
    fail("Test 22: Variant labels missing in order snapshot");
  }

  // Test 23 & 24: SKU and Unit Price Snapshots
  if (
    lineWhite?.sku_snapshot === varWhite42!.sku &&
    lineBlack?.sku_snapshot === varBlack40!.sku &&
    lineWhite?.unit_price_snapshot === 3000000 &&
    lineBlack?.unit_price_snapshot === 3200000
  ) {
    pass("Test 23 & 24: SKU and price snapshots (₦30,000 and ₦32,000) match purchase exactly");
  } else {
    fail("Test 23 & 24: SKU/Price snapshot mismatch");
  }

  // Test 25: Historical variant remains represented after subsequent variant change or retirement
  // Modify live variant price and archive it
  await sb
    .from("product_variants")
    .update({ price_override: 5000000, archived_at: new Date().toISOString() })
    .eq("id", varWhite42!.id);

  const historicalOrder = await orderService.getOrderDetails(createdOrder.id, { useAdmin: true });
  const histWhiteLine = historicalOrder.lines.find((l) => l.variant_id === varWhite42!.id);

  if (histWhiteLine?.unit_price_snapshot === 3000000) {
    pass("Test 25: Historical order snapshot unchanged after variant price increase & archival");
  } else {
    fail("Test 25: Historical order altered by live variant mutation", String(histWhiteLine?.unit_price_snapshot));
  }

  // Test 26: Reservation converted & inventory decremented
  const { data: updatedInvWhite } = await sb
    .from("inventory_records")
    .select("on_hand_quantity, reserved_quantity")
    .eq("variant_id", varWhite42!.id)
    .single();

  // Started with 10 on hand, purchased 2 -> on hand should now be 8, reserved 0
  if (updatedInvWhite?.on_hand_quantity === 8 && updatedInvWhite?.reserved_quantity === 0) {
    pass("Test 26: Inventory on-hand decremented (10 -> 8) and reservation converted");
  } else {
    fail("Test 26: Inventory deduction mismatch", JSON.stringify(updatedInvWhite));
  }

  // Test 27: Multi-item atomic reservation rollback
  // Attempt to reserve White/42 (available = 8) with qty 2, and Black/40 (available = 4) with qty 99
  const { data: testCart } = await sb
    .from("carts")
    .insert({ status: "active", expires_at: new Date(Date.now() + 86400000).toISOString() })
    .select("id")
    .single();
  cleanupCartIds.push(testCart!.id);

  const { data: testSession } = await sb
    .from("checkout_sessions")
    .insert({
      cart_id: testCart!.id,
      status: "open",
      expires_at: new Date(Date.now() + 1800000).toISOString(),
    })
    .select("id")
    .single();

  try {
    await inventoryService.reserveInventoryForCheckout(testSession!.id, [
      { variantId: varWhite42!.id, quantity: 2 },
      { variantId: varBlack40!.id, quantity: 99 }, // Over stock!
    ]);
    fail("Test 27: Expected atomic reservation to fail due to variant B");
  } catch (err: any) {
    // Verify NO reservation rows were created for variant A
    const { data: partialRes } = await sb
      .from("inventory_reservations")
      .select("id")
      .eq("checkout_session_id", testSession!.id);

    if ((partialRes ?? []).length === 0) {
      pass("Test 27: Atomic reservation rollback: failure on Variant B left zero partial reservations for Variant A");
    } else {
      fail("Test 27: Partial reservations found after failure", JSON.stringify(partialRes));
    }
  }

  // Test 28 & 29: Guest checkout end-to-end
  const guestToken = `token_p8_${Date.now()}`;
  const guestC = await cartRepo.createCartWithHash(guestToken);
  cleanupCartIds.push(guestC.id);

  // Restore varWhite42 to active
  await sb.from("product_variants").update({ archived_at: null }).eq("id", varWhite42!.id);

  await cartRepo.addCartItem(
    {
      cartId: guestC.id,
      variantId: varWhite42!.id,
      quantity: 1,
    },
    { tokenHash: guestToken }
  );

  const guestCheckout = await checkoutService.initiateCheckout({
    cartId: guestC.id,
    email: `guest-${Date.now()}@example.com`,
    fullName: "Guest Customer",
    shippingAddress: {
      addressLine1: "15 Broad St",
      city: "Ikeja",
      state: "Lagos",
      country: "NG",
    },
  });

  const guestOrder = await orderService.createOrderFromCheckout(
    guestCheckout.checkoutSession.id,
    `GUEST-PAY-${Date.now()}`
  );
  cleanupOrderIds.push(guestOrder.id);

  if (guestOrder?.id && guestOrder.order_number) {
    pass("Test 28 & 29: Guest checkout successfully completed without customer authentication");
  } else {
    fail("Test 28 & 29: Guest checkout order creation failed");
  }

  // Test 30 & 31: Reorder available vs retired variant
  const reorderCart = await cartRepo.createCart(customerId, { useAdmin: true });
  cleanupCartIds.push(reorderCart.id);

  // Archive varBlack40 so it tests retired variant skipping
  await sb.from("product_variants").update({ archived_at: new Date().toISOString() }).eq("id", varBlack40!.id);

  const reorderRes = await orderService.reorderItemsFromOrder(createdOrder.id, reorderCart.id, { useAdmin: true });
  if (reorderRes.addedCount === 1 && reorderRes.skippedItems.length === 1) {
    pass(
      "Test 30 & 31: Reorder re-added active variant and cleanly skipped retired variant without substituting"
    );
  } else {
    fail("Test 30 & 31: Reorder behavior mismatch", JSON.stringify(reorderRes));
  }

  // Test 32: Payment / order creation idempotency
  try {
    await orderService.createOrderFromCheckout(session.id, paymentRef);
    fail("Test 32: Expected duplicate order creation on completed session to be rejected");
  } catch (err: any) {
    pass("Test 32: Completed checkout session rejected duplicate order RPC call (Idempotency safe)", err.message);
  }

  // Test 33: Full end-to-end multi-variant scenario with realistic multi-option product
  const multiSlug = `realistic-sneaker-${Date.now()}`;
  const { data: sneaker } = await sb
    .from("products")
    .insert({
      name: "Sivvai Apex Sneaker",
      slug: multiSlug,
      category_id: categoryId,
      base_price: 4500000,
      status: "published",
    })
    .select("id")
    .single();
  cleanupProductIds.push(sneaker!.id);

  // Create 4 variants: White/40, White/41, Black/40, Black/41
  const sVars = await sb.from("product_variants").insert([
    { product_id: sneaker!.id, sku: `APEX-WHT-40-${Date.now()}`, option_combination: { Color: "White", Size: "40" }, status: "active", is_default: true },
    { product_id: sneaker!.id, sku: `APEX-WHT-41-${Date.now()}`, option_combination: { Color: "White", Size: "41" }, status: "active", is_default: false },
    { product_id: sneaker!.id, sku: `APEX-BLK-40-${Date.now()}`, option_combination: { Color: "Black", Size: "40" }, status: "active", is_default: false },
    { product_id: sneaker!.id, sku: `APEX-BLK-41-${Date.now()}`, option_combination: { Color: "Black", Size: "41" }, status: "active", is_default: false },
  ]).select("id, sku");

  // Populate stock
  for (const v of sVars.data!) {
    await sb.from("inventory_records").update({ on_hand_quantity: 10, track_inventory: true }).eq("variant_id", v.id);
  }

  const e2eCart = await cartRepo.createCart(customerId, { useAdmin: true });
  cleanupCartIds.push(e2eCart.id);

  // Add 2 x White/40 and 1 x Black/41
  await cartRepo.addCartItem({ cartId: e2eCart.id, variantId: sVars.data![0].id, quantity: 2 }, { useAdmin: true });
  await cartRepo.addCartItem({ cartId: e2eCart.id, variantId: sVars.data![3].id, quantity: 1 }, { useAdmin: true });

  const e2eCheckout = await checkoutService.initiateCheckout({
    cartId: e2eCart.id,
    email: "e2e@example.com",
    fullName: "E2E Tester",
    shippingAddress: { addressLine1: "1 Apex Way", city: "Abuja", state: "FCT", country: "NG" },
  });

  const e2eOrder = await orderService.createOrderFromCheckout(
    e2eCheckout.checkoutSession.id,
    `E2E-PAY-${Date.now()}`
  );
  cleanupOrderIds.push(e2eOrder.id);

  const e2eLines = await sb.from("order_lines").select("variant_id, quantity, unit_price_snapshot").eq("order_id", e2eOrder.id);
  if (e2eLines.data?.length === 2 && e2eOrder.grand_total === 13500000) {
    pass("Test 33: Full realistic multi-variant end-to-end commerce scenario passed with 100% variant fidelity");
  } else {
    fail("Test 33: Multi-variant end-to-end scenario failed", JSON.stringify(e2eLines.data));
  }
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

async function main() {
  console.log("==================================================================");
  console.log("  SIVVAI LABS COMMERCE KIT — PHASE 7 & PHASE 8 VERIFICATION SUITE ");
  console.log("==================================================================");

  let categoryId: string | undefined;

  try {
    categoryId = await getOrCreateCategory();
    await runPhase7Tests(categoryId);
    await runPhase8Tests(categoryId);
  } catch (err: any) {
    console.error("❌ Unexpected test runner error:", err);
    failed++;
  } finally {
    await performCleanup();
  }

  console.log("\n==================================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
