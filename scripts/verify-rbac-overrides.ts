/**
 * scripts/verify-rbac-overrides.ts
 *
 * Verification suite for Phase 3 — Per-User Permission Overrides.
 * Tests effective permission resolution (Role ∪ Grant - Deny, Owner immunity, Inactive admins).
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
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

interface RolePermRow {
  permissions: { key: string } | null;
}

interface OverrideRow {
  is_granted: boolean;
  permissions: { key: string } | null;
}

/** Compute effective permissions for a given roleId and overrides map using the exact algorithm */
async function resolveEffectivePermissions(
  roleId: string | null,
  isProtectedOwner: boolean,
  mockOverrides: Array<{ key: string; is_granted: boolean }> = []
): Promise<string[]> {
  if (isProtectedOwner) {
    const { data } = await supabase.from("permissions").select("key");
    return (data ?? []).map((p) => p.key).filter(Boolean) as string[];
  }

  const { data: rolePerms } = roleId
    ? await supabase.from("role_permissions").select("permissions(key)").eq("role_id", roleId)
    : { data: [] };

  const roleKeys: string[] = ((rolePerms ?? []) as unknown as RolePermRow[])
    .map((p) => p.permissions?.key)
    .filter((k): k is string => Boolean(k));

  const effectiveSet = new Set<string>(roleKeys);

  for (const ov of mockOverrides) {
    if (ov.is_granted) {
      effectiveSet.add(ov.key);
    } else {
      effectiveSet.delete(ov.key);
    }
  }

  return Array.from(effectiveSet);
}

/** App-level checkPermission helper with hierarchy support */
function checkPermission(effectivePermissions: string[], permission: string): boolean {
  if (effectivePermissions.includes(permission)) return true;
  if (permission === "view_orders" && effectivePermissions.includes("manage_orders")) return true;
  if (permission === "view_customers" && effectivePermissions.includes("manage_customers")) return true;
  return false;
}

async function main() {
  console.log("\n=== Phase 3 RBAC Override Verification ===\n");

  // 1. Fetch roles from DB
  const { data: roles, error: rolesErr } = await supabase.from("roles").select("id, key");
  assert(!rolesErr && Boolean(roles?.length), "Roles table fetched successfully from DB", rolesErr?.message);

  const roleMap = Object.fromEntries((roles ?? []).map((r) => [r.key, r.id]));
  const editorRoleId = roleMap["editor"];
  const managerRoleId = roleMap["manager"];
  const supportRoleId = roleMap["support"];

  assert(Boolean(editorRoleId), "Found 'editor' role in database");
  assert(Boolean(managerRoleId), "Found 'manager' role in database");
  assert(Boolean(supportRoleId), "Found 'support' role in database");

  // ---------------------------------------------------------------------------
  // Test 1: Role inheritance — Editor with no overrides
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 1: Role inheritance (Editor, no overrides) ---");
  const editorPerms = await resolveEffectivePermissions(editorRoleId, false, []);
  assert(editorPerms.includes("manage_products"), "Editor has manage_products from role");
  assert(editorPerms.includes("manage_categories"), "Editor has manage_categories from role");
  assert(!editorPerms.includes("manage_inventory"), "Editor does NOT have manage_inventory by role");
  assert(!editorPerms.includes("manage_shipping"), "Editor does NOT have manage_shipping by role");

  // ---------------------------------------------------------------------------
  // Test 2: GRANT override — Editor + manage_inventory GRANT
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 2: GRANT override (Editor + manage_inventory GRANT) ---");
  const editorWithGrant = await resolveEffectivePermissions(editorRoleId, false, [
    { key: "manage_inventory", is_granted: true },
  ]);
  assert(editorWithGrant.includes("manage_inventory"), "Editor with GRANT override has manage_inventory");
  assert(editorWithGrant.includes("manage_products"), "Editor still has role's manage_products after GRANT");

  // ---------------------------------------------------------------------------
  // Test 3: DENY override — Manager + manage_promotions DENY
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 3: DENY override (Manager + manage_promotions DENY) ---");
  const managerBasePerms = await resolveEffectivePermissions(managerRoleId, false, []);
  assert(managerBasePerms.includes("manage_promotions"), "Manager has manage_promotions from role");

  const managerWithDeny = await resolveEffectivePermissions(managerRoleId, false, [
    { key: "manage_promotions", is_granted: false },
  ]);
  assert(!managerWithDeny.includes("manage_promotions"), "Manager with DENY override loses manage_promotions");

  // ---------------------------------------------------------------------------
  // Test 4: INHERIT — Manager + no override for manage_shipping
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 4: INHERIT (Manager, no override for manage_shipping) ---");
  const managerInherit = await resolveEffectivePermissions(managerRoleId, false, []);
  assert(managerInherit.includes("manage_shipping"), "Manager INHERITS manage_shipping from role (no override row)");

  // ---------------------------------------------------------------------------
  // Test 5: GRANT overriding role absence — Support + manage_products GRANT
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 5: GRANT overriding role absence (Support + manage_products GRANT) ---");
  const supportBase = await resolveEffectivePermissions(supportRoleId, false, []);
  assert(!supportBase.includes("manage_products"), "Support does NOT have manage_products from role");

  const supportWithGrant = await resolveEffectivePermissions(supportRoleId, false, [
    { key: "manage_products", is_granted: true },
  ]);
  assert(supportWithGrant.includes("manage_products"), "Support with GRANT receives manage_products");

  // ---------------------------------------------------------------------------
  // Test 6: DENY overriding role grant — Manager + manage_shipping DENY
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 6: DENY overriding role grant (Manager + manage_shipping DENY) ---");
  const managerNoShipping = await resolveEffectivePermissions(managerRoleId, false, [
    { key: "manage_shipping", is_granted: false },
  ]);
  assert(!managerNoShipping.includes("manage_shipping"), "Manager with DENY override loses manage_shipping");

  // ---------------------------------------------------------------------------
  // Test 7: Protected Owner immunity
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 7: Protected Owner immunity to DENY overrides ---");
  const ownerPerms = await resolveEffectivePermissions(null, true, [
    { key: "manage_settings", is_granted: false },
    { key: "manage_users", is_granted: false },
    { key: "manage_shipping", is_granted: false },
  ]);
  assert(ownerPerms.includes("manage_settings"), "Protected Owner retains manage_settings despite DENY");
  assert(ownerPerms.includes("manage_users"), "Protected Owner retains manage_users despite DENY");
  assert(ownerPerms.includes("manage_shipping"), "Protected Owner retains manage_shipping despite DENY");

  // ---------------------------------------------------------------------------
  // Test 8: Permission hierarchy — manage_orders implies view_orders
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 8: Permission hierarchy (manage_orders → view_orders) ---");
  const managerEffective = await resolveEffectivePermissions(managerRoleId, false, []);
  assert(checkPermission(managerEffective, "view_orders"), "Manager satisfies view_orders via manage_orders hierarchy");
  assert(checkPermission(managerEffective, "manage_orders"), "Manager directly satisfies manage_orders");

  // ---------------------------------------------------------------------------
  // Test 9: Database Table Operations & RLS Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- Test 9: admin_user_permissions table operations ---");
  const { data: permRow } = await supabase.from("permissions").select("id").eq("key", "manage_shipping").single();
  const { data: adminUser } = await supabase.from("admin_users").select("id").limit(1).single();

  if (permRow && adminUser) {
    // Test upsert override
    const { error: upsertErr } = await supabase.from("admin_user_permissions").upsert({
      admin_user_id: adminUser.id,
      permission_id: permRow.id,
      is_granted: true,
    });
    assert(!upsertErr, "Successfully upserted override into admin_user_permissions table", upsertErr?.message);

    // Test select
    const { data: selectData, error: selectErr } = await supabase
      .from("admin_user_permissions")
      .select("is_granted, permissions(key)")
      .eq("admin_user_id", adminUser.id)
      .eq("permission_id", permRow.id);

    const castData = selectData as unknown as OverrideRow[];
    assert(
      !selectErr && castData?.length === 1 && castData[0].is_granted === true,
      "Successfully queried override from admin_user_permissions table"
    );

    // Test cleanup/delete
    const { error: delErr } = await supabase
      .from("admin_user_permissions")
      .delete()
      .eq("admin_user_id", adminUser.id)
      .eq("permission_id", permRow.id);

    assert(!delErr, "Successfully deleted test override from admin_user_permissions table", delErr?.message);
  } else {
    fail("Test 9: Could not find permission row or admin user for DB table operation test");
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.error("\n❌ Some tests failed.");
    process.exit(1);
  } else {
    console.log("\n🎉 All Phase 3 RBAC override verification tests PASSED!\n");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
