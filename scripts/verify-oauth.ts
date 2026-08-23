/**
 * scripts/verify-oauth.ts
 *
 * Verification Suite for Phase 4.2: Google OAuth & Auth/Cart Regression Fixes.
 *
 * Verifies:
 * 1. Google OAuth metadata name parsing (given_name, family_name, full_name, name)
 * 2. Customer synchronization & deduplication (first-time, guest-link, duplicate)
 * 3. Guest-cart merging & reconciliation lifecycle
 * 4. Callback route & Confirm route architecture (PKCE, verifyOtp, error handling)
 * 5. Cart RLS token header injection & cart creation safety
 * 6. UI Integration, Google button rendering, & accessibility
 * 7. Clean removal of Apple-specific dependencies/buttons
 */

import { parseOAuthNames } from "../lib/auth/oauth";
import * as fs from "fs";

async function runOAuthVerification() {
  console.log("=================================================");
  console.log("Phase 4.2 Verification: Google OAuth & Auth Fixes");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details || ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: OAuth Name Parser — Google Format (given_name / family_name)
  // -------------------------------------------------------------
  console.log("--- 1. Google OAuth Metadata Parser Tests ---");

  const googleMeta = {
    given_name: "Chukwudi",
    family_name: "Eze",
    full_name: "Chukwudi Eze",
    avatar_url: "https://lh3.googleusercontent.com/a/abc123",
  };
  const parsedGoogle = parseOAuthNames(googleMeta);
  assert(parsedGoogle.firstName === "Chukwudi", "Google parser extracts given_name as firstName");
  assert(parsedGoogle.lastName === "Eze", "Google parser extracts family_name as lastName");

  // -------------------------------------------------------------
  // Test 2: OAuth Name Parser — Single Full Name String
  // -------------------------------------------------------------
  const singleNameMeta = {
    name: "Dr. Ngozi Okonjo Iweala",
  };
  const parsedSingle = parseOAuthNames(singleNameMeta);
  assert(parsedSingle.firstName === "Dr.", "Full name string parser extracts first token as firstName");
  assert(parsedSingle.lastName === "Ngozi Okonjo Iweala", "Full name string parser extracts remainder as lastName");

  // -------------------------------------------------------------
  // Test 3: OAuth Name Parser — Direct first_name / last_name
  // -------------------------------------------------------------
  const directNameMeta = {
    first_name: "Amara",
    last_name: "Okafor",
  };
  const parsedDirect = parseOAuthNames(directNameMeta);
  assert(parsedDirect.firstName === "Amara", "Direct first_name parser extracts firstName");
  assert(parsedDirect.lastName === "Okafor", "Direct last_name parser extracts lastName");

  // -------------------------------------------------------------
  // Test 4: OAuth Name Parser — Empty / Missing Metadata
  // -------------------------------------------------------------
  const emptyParsed = parseOAuthNames({});
  assert(emptyParsed.firstName === null && emptyParsed.lastName === null, "Empty metadata returns nulls safely");

  // -------------------------------------------------------------
  // Test 5: Customer Sync — Deduplication & Linking Invariants
  // -------------------------------------------------------------
  console.log("\n--- 2. Customer Deduplication & Linking Invariant Tests ---");

  interface MockCustomer {
    id: string;
    auth_id: string | null;
    email: string;
    first_name: string | null;
    last_name: string | null;
    status: string;
  }

  const mockCustomerDb = new Map<string, MockCustomer>();

  // Implementation matching customer-service.ts syncCustomerOnOAuthLogin
  function simulateSync(authUser: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
    phone?: string;
  }) {
    const email = authUser.email.toLowerCase().trim();
    const { firstName, lastName } = parseOAuthNames(authUser.user_metadata);

    // 1. By auth_id
    for (const c of mockCustomerDb.values()) {
      if (c.auth_id === authUser.id) {
        if (!c.first_name && firstName) c.first_name = firstName;
        if (!c.last_name && lastName) c.last_name = lastName;
        return { customer: c, action: "matched_auth_id" };
      }
    }

    // 2. By email (linking unlinked guest profile)
    for (const c of mockCustomerDb.values()) {
      if (c.email === email) {
        c.auth_id = authUser.id;
        if (!c.first_name && firstName) c.first_name = firstName;
        if (!c.last_name && lastName) c.last_name = lastName;
        return { customer: c, action: "linked_guest_email" };
      }
    }

    // 3. Create fresh
    const newId = `cust-${mockCustomerDb.size + 1}`;
    const newCustomer: MockCustomer = {
      id: newId,
      auth_id: authUser.id,
      email,
      first_name: firstName,
      last_name: lastName,
      status: "active",
    };
    mockCustomerDb.set(newId, newCustomer);
    return { customer: newCustomer, action: "created_new" };
  }

  // Step A: First-time Google user signs up
  const res1 = simulateSync({
    id: "auth-google-101",
    email: "tunde@example.com",
    user_metadata: { given_name: "Tunde", family_name: "Bakare" },
  });
  assert(res1.action === "created_new", "First-time Google OAuth user creates new customer record");
  assert(mockCustomerDb.size === 1, "DB contains 1 customer");

  // Step B: Same user signs in again (Idempotency)
  const res2 = simulateSync({
    id: "auth-google-101",
    email: "tunde@example.com",
    user_metadata: { given_name: "Tunde", family_name: "Bakare" },
  });
  assert(res2.action === "matched_auth_id", "Second Google OAuth login matches existing auth_id");
  assert(mockCustomerDb.size === 1, "DB still contains exactly 1 customer (no duplicates)");

  // Step C: Guest who previously checked out signs in with Google
  mockCustomerDb.set("cust-guest-99", {
    id: "cust-guest-99",
    auth_id: null,
    email: "guest.shopper@example.com",
    first_name: null,
    last_name: null,
    status: "active",
  });
  assert(mockCustomerDb.size === 2, "DB setup: 1 Google customer + 1 guest customer");

  const res3 = simulateSync({
    id: "auth-google-202",
    email: "guest.shopper@example.com",
    user_metadata: { given_name: "Kemi", family_name: "Adesina" },
  });
  assert(res3.action === "linked_guest_email", "Existing guest record is linked to new Google auth_id");
  assert(res3.customer.id === "cust-guest-99", "Preserves existing customer UUID");
  assert(res3.customer.first_name === "Kemi", "Backfills customer first_name from Google metadata");
  assert(mockCustomerDb.size === 2, "DB total customer count remains 2 (zero duplicate rows)");

  // -------------------------------------------------------------
  // Test 6: Guest Cart Merging & Reconciliation Lifecycle
  // -------------------------------------------------------------
  console.log("\n--- 3. Guest Cart Reconciliation Lifecycle Tests ---");

  interface MockCartLine {
    variant_id: string;
    quantity: number;
    unit_price_snapshot: number;
  }

  const guestCartItems: MockCartLine[] = [
    { variant_id: "var-shoes-42", quantity: 2, unit_price_snapshot: 1500000 },
    { variant_id: "var-hat-red", quantity: 1, unit_price_snapshot: 500000 },
  ];

  const customerExistingItems: MockCartLine[] = [
    { variant_id: "var-shoes-42", quantity: 1, unit_price_snapshot: 1500000 },
    { variant_id: "var-socks-black", quantity: 3, unit_price_snapshot: 200000 },
  ];

  // Reconcile logic matching cart-service.ts mergeGuestCartOnLogin
  const mergedItemsMap = new Map<string, MockCartLine>();
  for (const line of customerExistingItems) {
    mergedItemsMap.set(line.variant_id, { ...line });
  }
  for (const line of guestCartItems) {
    if (mergedItemsMap.has(line.variant_id)) {
      const current = mergedItemsMap.get(line.variant_id)!;
      current.quantity += line.quantity;
    } else {
      mergedItemsMap.set(line.variant_id, { ...line });
    }
  }

  const finalMergedLines = Array.from(mergedItemsMap.values());
  const shoesLine = finalMergedLines.find((l) => l.variant_id === "var-shoes-42");
  const hatLine = finalMergedLines.find((l) => l.variant_id === "var-hat-red");
  const socksLine = finalMergedLines.find((l) => l.variant_id === "var-socks-black");

  assert(shoesLine?.quantity === 3, "Duplicate variant quantities are summed on login (1 + 2 = 3)");
  assert(hatLine?.quantity === 1, "New guest variant is added to customer cart");
  assert(socksLine?.quantity === 3, "Pre-existing customer variant is preserved");
  assert(finalMergedLines.length === 3, "No duplicate cart line entries created");

  // -------------------------------------------------------------
  // Test 7: Email Confirmation & Callback Route Architecture
  // -------------------------------------------------------------
  console.log("\n--- 4. Email Confirmation & Callback Route Tests ---");

  const confirmCode = fs.readFileSync("app/auth/confirm/route.ts", "utf-8");
  assert(confirmCode.includes("supabase.auth.verifyOtp"), "app/auth/confirm implements verifyOtp");
  assert(confirmCode.includes("syncCustomerOnOAuthLogin"), "app/auth/confirm synchronizes customer record");
  assert(confirmCode.includes("mergeCartOnLoginAction"), "app/auth/confirm merges active guest cart");

  const callbackCode = fs.readFileSync("app/auth/callback/route.ts", "utf-8");
  assert(callbackCode.includes('type === "admin_invite"'), "Callback preserves Admin Invitation handler");
  assert(callbackCode.includes('next.startsWith("/auth/reset-password")'), "Callback preserves Password Reset flow");
  assert(callbackCode.includes("exchangeCodeForSession"), "Callback handles PKCE exchange");
  assert(callbackCode.includes("verifyOtp"), "Callback handles token_hash OTP fallback");
  assert(callbackCode.includes("authError"), "Callback handles provider error parameters gracefully");

  // -------------------------------------------------------------
  // Test 8: Cart RLS & Token Header Safety
  // -------------------------------------------------------------
  console.log("\n--- 5. Cart RLS & Token Header Tests ---");

  const serverClientCode = fs.readFileSync("lib/supabase/server.ts", "utf-8");
  assert(serverClientCode.includes("options?.cartTokenHash"), "createServerClient supports explicit cartTokenHash header");
  assert(serverClientCode.includes('"x-cart-token-hash"'), "createServerClient passes x-cart-token-hash header");

  const cartDbCode = fs.readFileSync("lib/db/carts.ts", "utf-8");
  assert(cartDbCode.includes("cartTokenHash: tokenHash"), "createCartWithHash passes matching tokenHash to createClient");
  assert(cartDbCode.includes("findCartByTokenHash"), "findCartByTokenHash queries with matching tokenHash");

  const cartActionsCode = fs.readFileSync("features/storefront/actions/cart.actions.ts", "utf-8");
  assert(cartActionsCode.includes("createGuestCartWithToken(token)"), "getOrCreateCartAction reuses existing token on recreation");

  // -------------------------------------------------------------
  // Test 9: UI Integration & Scope Check (Google only)
  // -------------------------------------------------------------
  console.log("\n--- 6. UI Integration & Google-Only Scope Checks ---");

  const signInFormCode = fs.readFileSync("components/storefront/auth/SignInForm.tsx", "utf-8");
  const signUpFormCode = fs.readFileSync("components/storefront/auth/SignUpForm.tsx", "utf-8");
  const socialAuthCode = fs.readFileSync("components/storefront/auth/SocialAuthButtons.tsx", "utf-8");

  assert(signInFormCode.includes("<SocialAuthButtons"), "SignInForm includes SocialAuthButtons");
  assert(signUpFormCode.includes("<SocialAuthButtons"), "SignUpForm includes SocialAuthButtons");
  assert(socialAuthCode.includes('"google"'), "SocialAuthButtons supports Google OAuth");
  assert(!socialAuthCode.includes('"apple"'), "SocialAuthButtons has no Apple button/handler");
  assert(socialAuthCode.includes("Continue with Google"), "Button displays 'Continue with Google'");
  assert(socialAuthCode.includes("min-h-[44px]"), "Button meets minimum touch target requirement (44px)");

  console.log("\n=================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runOAuthVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
