/**
 * scripts/verify-promotion-creation.ts
 *
 * Verification suite for Admin Promotion and Coupon Code Creation.
 * Tests:
 * 1. Percentage promotion creation (e.g. 10%, max uses 100, end of day 2026-09-30)
 * 2. Fixed amount promotion creation (e.g. ₦2,000 = 200,000 kobo)
 * 3. Atomic transaction rollback on duplicate coupon code (no orphan promotion)
 * 4. Live RPC verification against remote database
 * 5. Admin query verification (findAllPromotions)
 * 6. Clean cleanup of test records
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});interface CouponResult {
  id: string;
  promotion_id: string;
  code: string;
  max_uses: number | null;
  current_uses: number;
  created_at: string;
  updated_at: string;
}

interface PromotionResult {
  id: string;
  name: string;
  type: string;
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  coupon_codes: CouponResult[];
}

async function main() {
  console.log("==================================================================");
  console.log("  Admin Promotion & Coupon Code Creation Verification Suite");
  console.log("==================================================================\n");

  const createdPromoIds: string[] = [];

  try {
    // Clean up any stale test coupons first
    await sb.from("coupon_codes").delete().in("code", ["SEPT10", "SAVE2000", "TESTDUP"]);
    await sb.from("promotions").delete().in("name", ["September Launch", "₦2,000 Off", "Duplicate Promo"]);

    // -------------------------------------------------------------------------
    // TEST 1: Percentage Promotion Creation
    // -------------------------------------------------------------------------
    console.log("[TEST 1] Creating Percentage Promotion (September Launch / SEPT10)...");
    const { data: promo1Data, error: promo1Err } = (await sb.rpc("create_promotion_with_coupon_rpc" as never, {
      p_name: "September Launch",
      p_type: "percentage",
      p_value: 10,
      p_code: "SEPT10",
      p_max_uses: 100,
      p_starts_at: null,
      p_ends_at: "2026-09-30T23:59:59.999Z",
      p_is_active: true,
    } as never)) as { data: PromotionResult | null; error: { message: string } | null };

    if (promo1Err || !promo1Data) {
      throw new Error(`Test 1 Failed: ${promo1Err?.message || "No data returned"}`);
    }

    createdPromoIds.push(promo1Data.id);
    console.log("  Created Promotion ID:", promo1Data.id);
    console.log("  Name:", promo1Data.name);
    console.log("  Type:", promo1Data.type);
    console.log("  Value:", promo1Data.value, "(10%)");
    console.log("  Ends At:", promo1Data.ends_at);
    console.log("  Coupons:", JSON.stringify(promo1Data.coupon_codes));

    if (
      promo1Data.name !== "September Launch" ||
      promo1Data.type !== "percentage" ||
      Number(promo1Data.value) !== 10 ||
      promo1Data.coupon_codes[0]?.code !== "SEPT10" ||
      promo1Data.coupon_codes[0]?.max_uses !== 100
    ) {
      throw new Error("Test 1 Verification Failed: Data mismatch in created promotion");
    }
    console.log("✅ TEST 1 PASSED: Percentage promotion + coupon created successfully.\n");

    // -------------------------------------------------------------------------
    // TEST 2: Fixed Amount Promotion Creation (₦2,000 = 200,000 kobo)
    // -------------------------------------------------------------------------
    console.log("[TEST 2] Creating Fixed Amount Promotion (₦2,000 Off / SAVE2000)...");
    const { data: promo2Data, error: promo2Err } = (await sb.rpc("create_promotion_with_coupon_rpc" as never, {
      p_name: "₦2,000 Off",
      p_type: "fixed_amount",
      p_value: 200000, // 200,000 kobo = ₦2,000
      p_code: "save2000", // should be uppercased to SAVE2000
      p_max_uses: null, // unlimited
      p_starts_at: null,
      p_ends_at: null,
      p_is_active: true,
    } as never)) as { data: PromotionResult | null; error: { message: string } | null };

    if (promo2Err || !promo2Data) {
      throw new Error(`Test 2 Failed: ${promo2Err?.message || "No data returned"}`);
    }

    createdPromoIds.push(promo2Data.id);
    console.log("  Created Promotion ID:", promo2Data.id);
    console.log("  Name:", promo2Data.name);
    console.log("  Type:", promo2Data.type);
    console.log("  Value (kobo):", promo2Data.value);
    console.log("  Coupons:", JSON.stringify(promo2Data.coupon_codes));

    if (
      promo2Data.name !== "₦2,000 Off" ||
      promo2Data.type !== "fixed_amount" ||
      Number(promo2Data.value) !== 200000 ||
      promo2Data.coupon_codes[0]?.code !== "SAVE2000" ||
      promo2Data.coupon_codes[0]?.max_uses !== null
    ) {
      throw new Error("Test 2 Verification Failed: Data mismatch in created fixed amount promotion");
    }
    console.log("✅ TEST 2 PASSED: Fixed amount promotion created with correct kobo minor units.\n");

    // -------------------------------------------------------------------------
    // TEST 3: Duplicate Coupon Code Rejection & Transaction Rollback
    // -------------------------------------------------------------------------
    console.log("[TEST 3] Testing Duplicate Coupon Code Rejection (attempting SEPT10 again)...");
    const { count: promoCountBefore } = await sb.from("promotions").select("*", { count: "exact", head: true });
    const { count: couponCountBefore } = await sb.from("coupon_codes").select("*", { count: "exact", head: true });

    const { error: promo3Err } = (await sb.rpc("create_promotion_with_coupon_rpc" as never, {
      p_name: "Duplicate Promo",
      p_type: "percentage",
      p_value: 15,
      p_code: "SEPT10", // already exists!
      p_max_uses: 50,
      p_starts_at: null,
      p_ends_at: null,
      p_is_active: true,
    } as never)) as { data: PromotionResult | null; error: { message: string } | null };

    if (!promo3Err) {
      throw new Error("Test 3 Failed: Duplicate coupon code was not rejected!");
    }

    console.log("  Received expected error:", promo3Err.message);

    const { count: promoCountAfter } = await sb.from("promotions").select("*", { count: "exact", head: true });
    const { count: couponCountAfter } = await sb.from("coupon_codes").select("*", { count: "exact", head: true });

    console.log(`  Promotion count: before=${promoCountBefore}, after=${promoCountAfter}`);
    console.log(`  Coupon count:    before=${couponCountBefore}, after=${couponCountAfter}`);

    if (promoCountBefore !== promoCountAfter || couponCountBefore !== couponCountAfter) {
      throw new Error("Test 3 Failed: Database was modified despite duplicate error! Atomicity violated!");
    }

    // Verify specifically that NO promotion with name "Duplicate Promo" exists
    const { data: orphanCheck } = await sb.from("promotions").select("id").eq("name", "Duplicate Promo");
    if (orphanCheck && orphanCheck.length > 0) {
      throw new Error("Test 3 Failed: Orphan promotion row was left behind!");
    }

    console.log("✅ TEST 3 PASSED: Duplicate code rejected cleanly, transaction rolled back, NO orphan rows.\n");

    // -------------------------------------------------------------------------
    // TEST 4: Admin Promotion Query Verification
    // -------------------------------------------------------------------------
    console.log("[TEST 4] Verifying Admin Promotions List Query...");
    const { data: allPromotions, error: allErr } = (await sb
      .from("promotions")
      .select("*, coupon_codes(*)")
      .order("created_at", { ascending: false })) as { data: PromotionResult[] | null; error: { message: string } | null };

    if (allErr || !allPromotions) {
      throw new Error(`Test 4 Failed: ${allErr?.message}`);
    }

    console.log(`  Found ${allPromotions.length} promotion(s) in Admin list.`);
    const foundSept = allPromotions.find((p) => p.name === "September Launch");
    const foundSave = allPromotions.find((p) => p.name === "₦2,000 Off");

    if (!foundSept || !foundSave) {
      throw new Error("Test 4 Failed: Created promotions not found in admin list query");
    }

    console.log("  September Launch joined coupons:", foundSept.coupon_codes.map((c) => c.code));
    console.log("  ₦2,000 Off joined coupons:", foundSave.coupon_codes.map((c) => c.code));
    console.log("✅ TEST 4 PASSED: Admin promotion list returns complete joined records.\n");

    console.log("==================================================================");
    console.log("  ALL TESTS PASSED SUCCESSFULLY! ✅");
    console.log("==================================================================");
  } finally {
    // Clean up created test promotions (cascades to coupon_codes)
    if (createdPromoIds.length > 0) {
      console.log("\nCleaning up test promotion records...");
      await sb.from("promotions").delete().in("id", createdPromoIds);
      console.log("Cleanup complete.");
    }
  }
}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
