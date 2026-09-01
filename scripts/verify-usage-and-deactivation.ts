/**
 * scripts/verify-usage-and-deactivation.ts
 *
 * Verification suite for:
 * 1. Coupon max usage enforcement (rejection when current_uses >= max_uses)
 * 2. Deactivated coupon rejection (is_active = false)
 * 3. Reactivated coupon acceptance (is_active = true)
 * 4. Automatic cleanup of test records
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
});

// Standalone validate function reproducing promotion-service.ts logic
async function validateAndApplyPromoTest(code: string, subtotal: number) {
  const { data, error } = await sb
    .from("coupon_codes")
    .select("*, promotion:promotions(*)")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error || !data || !data.promotion) {
    throw new Error(`Invalid promotion code: ${code}`);
  }

  const promo = data.promotion as { is_active: boolean; starts_at: string | null; ends_at: string | null; type: string; value: number };
  const coupon = data as { max_uses: number | null; current_uses: number };

  if (!promo.is_active) {
    throw new Error("This promotion is no longer active");
  }

  const now = new Date();
  if (promo.starts_at && new Date(promo.starts_at) > now) {
    throw new Error("Promotion has not started yet");
  }
  if (promo.ends_at && new Date(promo.ends_at) < now) {
    throw new Error("Promotion code has expired");
  }

  if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
    throw new Error("Promotion code has reached its usage limit");
  }

  let discountAmount = 0;
  if (promo.type === "fixed_amount") {
    discountAmount = Number(promo.value) / 100;
  } else if (promo.type === "percentage") {
    discountAmount = (subtotal * Number(promo.value)) / 100;
  }

  discountAmount = Math.min(discountAmount, subtotal);

  return {
    coupon,
    promotion: promo,
    discountAmount,
  };
}

async function main() {
  console.log("=== Testing Coupon Max Usage & Deactivation Enforcement ===\n");
  const testCode = `TESTUSE_${Date.now()}`;
  let promoId: string | null = null;
  let couponId: string | null = null;

  try {
    // 1. Create a test promotion with max_uses = 2
    console.log("Step 1: Creating test promotion with max_uses = 2...");
    const { data: createData, error: createError } = await sb.rpc("create_promotion_with_coupon_rpc" as never, {
      p_name: "Test Max Usage Promo",
      p_type: "percentage",
      p_value: 15,
      p_code: testCode,
      p_max_uses: 2,
      p_starts_at: null,
      p_ends_at: null,
      p_is_active: true,
    } as never);

    if (createError || !createData) {
      throw new Error(`Failed to create test promo: ${createError?.message}`);
    }

    promoId = (createData as { id: string }).id;
    const couponCodes = (createData as { coupon_codes: Array<{ id: string; current_uses: number; max_uses: number }> }).coupon_codes;
    couponId = couponCodes[0].id;
    console.log(`  -> Created promo ${promoId} with coupon ${testCode} (max_uses: 2, current_uses: 0)`);

    // 2. Validate at current_uses = 0 (Should Succeed)
    console.log("\nStep 2: Validating coupon with current_uses = 0...");
    const res0 = await validateAndApplyPromoTest(testCode, 10000);
    console.log(`  -> Success! discountAmount = ₦${res0.discountAmount} (expected ₦1500)`);
    if (res0.discountAmount !== 1500) throw new Error("Incorrect discount amount");

    // 3. Increment current_uses to 1 (Should Succeed)
    console.log("\nStep 3: Incrementing current_uses to 1...");
    await sb.from("coupon_codes").update({ current_uses: 1 }).eq("id", couponId);
    const res1 = await validateAndApplyPromoTest(testCode, 10000);
    console.log(`  -> Success! discountAmount = ₦${res1.discountAmount}`);

    // 4. Increment current_uses to 2 (max reached - Should Fail)
    console.log("\nStep 4: Incrementing current_uses to 2 (max_uses = 2)...");
    await sb.from("coupon_codes").update({ current_uses: 2 }).eq("id", couponId);
    try {
      await validateAndApplyPromoTest(testCode, 10000);
      throw new Error("FAIL: Expected validation error when current_uses >= max_uses");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("usage limit")) {
        console.log(`  -> Correctly rejected: "${msg}"`);
      } else {
        throw new Error(`Unexpected error message: ${msg}`);
      }
    }

    // 5. Test Deactivation (is_active = false)
    console.log("\nStep 5: Resetting current_uses to 0 and deactivating promotion (is_active = false)...");
    await sb.from("coupon_codes").update({ current_uses: 0 }).eq("id", couponId);
    await sb.from("promotions").update({ is_active: false }).eq("id", promoId);

    try {
      await validateAndApplyPromoTest(testCode, 10000);
      throw new Error("FAIL: Expected validation error for deactivated promotion");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("no longer active") || msg.includes("Invalid promotion")) {
        console.log(`  -> Correctly rejected: "${msg}"`);
      } else {
        throw new Error(`Unexpected error message: ${msg}`);
      }
    }

    // 6. Test Reactivation (is_active = true)
    console.log("\nStep 6: Reactivating promotion (is_active = true)...");
    await sb.from("promotions").update({ is_active: true }).eq("id", promoId);
    const resActive = await validateAndApplyPromoTest(testCode, 10000);
    console.log(`  -> Success! Reactivated promo applied discount: ₦${resActive.discountAmount}`);

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    // Clean up
    if (promoId) {
      console.log("\nCleaning up test records...");
      await sb.from("promotions").delete().eq("id", promoId);
      console.log("  -> Test promo deleted.");
    }
  }
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
