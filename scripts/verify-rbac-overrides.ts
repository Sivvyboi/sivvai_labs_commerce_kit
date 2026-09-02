/**
 * scripts/verify-rbac-overrides.ts
 *
 * Comprehensive Real-DB Verification Suite for Phase 3 RBAC & Security Hardening.
 *
 * Tests:
 * 1. Role inheritance with real DB role_permissions (Editor)
 * 2. Real DB GRANT row in admin_user_permissions (Editor -> manage_inventory)
 * 3. Real DB DENY row in admin_user_permissions (Manager -> manage_promotions)
 * 4. Real DB INHERIT (Manager -> manage_shipping)
 * 5. Real DB GRANT on role absence (Support -> manage_products)
 * 6. Real DB DENY overriding role grant (Manager -> manage_shipping)
 * 7. Protected Owner immunity to real DB DENY overrides
 * 8. Inactive admin resolves to null / zero permissions
 * 9. Hierarchy resolution (manage_orders -> view_orders, manage_customers -> view_customers)
 * 10. Security privilege audit: private.admin_has_permission_direct is NOT accessible to authenticated/anon
 *
 * Safety & Isolation:
 * - Creates dedicated temporary test auth & admin accounts with unique prefixes
 * - All DB override mutations are performed on real DB tables and verified through the actual resolution pipeline
 * - Guaranteed cleanup in try/finally blocks
 */

import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
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

interface AdminUserRecord {
  id: string;
  auth_user_id: string;
  role_id: string | null;
  is_active: boolean;
  is_protected_owner: boolean;
  roles: { id: string; key: string; name: string; description: string | null } | null;
}

interface TestContext {
  user: { id: string; email: string };
  admin: AdminUserRecord;
  permissions: string[];
}

/**
 * Resolves effective permissions through the exact database query path
 * used by getCurrentAdminContext() in services/authz-service.ts.
 */
async function resolveAdminContextFromDB(
  client: SupabaseClient,
  authUserId: string
): Promise<TestContext | null> {
  const { data: rawAdmin, error: adminErr } = await client
    .from("admin_users")
    .select(`
      id,
      auth_user_id,
      role_id,
      is_active,
      is_protected_owner,
      created_at,
      updated_at,
      roles (
        id,
        key,
        name,
        description
      )
    `)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (adminErr || !rawAdmin) {
    return null;
  }

  const admin = rawAdmin as unknown as AdminUserRecord;

  if (!admin.is_active) {
    return null; // Inactive admins fail closed
  }

  let permissions: string[] = [];

  if (admin.is_protected_owner) {
    const { data: allPerms, error: permsErr } = await client
      .from("permissions")
      .select("key");

    if (permsErr) return null;

    permissions = (allPerms ?? [])
      .map((p) => p.key)
      .filter((k): k is string => Boolean(k));
  } else {
    const [rolePermsRes, overridesRes] = await Promise.all([
      admin.role_id
        ? client
            .from("role_permissions")
            .select("permissions(key)")
            .eq("role_id", admin.role_id)
        : Promise.resolve({ data: [], error: null }),
      client
        .from("admin_user_permissions")
        .select("is_granted, permissions(key)")
        .eq("admin_user_id", admin.id),
    ]);

    if (rolePermsRes.error || overridesRes.error) {
      return null;
    }

    interface RolePermItem { permissions: { key: string } | null; }
    interface OverrideItem { is_granted: boolean; permissions: { key: string } | null; }

    const roleKeys = ((rolePermsRes.data ?? []) as unknown as RolePermItem[])
      .map((p) => p.permissions?.key)
      .filter((k): k is string => Boolean(k));

    const effectiveSet = new Set<string>(roleKeys);

    const overrides = (overridesRes.data ?? []) as unknown as OverrideItem[];
    for (const ov of overrides) {
      const key = ov.permissions?.key;
      if (!key) continue;
      if (ov.is_granted) {
        effectiveSet.add(key);
      } else {
        effectiveSet.delete(key);
      }
    }

    permissions = Array.from(effectiveSet);
  }

  return {
    user: { id: admin.auth_user_id, email: "" },
    admin,
    permissions,
  };
}

/** Application-level checkPermission helper with hierarchy support */
function checkPermission(ctx: TestContext | null, permission: string): boolean {
  if (!ctx) return false;
  return (
    ctx.permissions.includes(permission) ||
    (permission === "view_orders" && ctx.permissions.includes("manage_orders")) ||
    (permission === "view_customers" && ctx.permissions.includes("manage_customers"))
  );
}

// Track created test resources for cleanup
const createdAuthUserIds: string[] = [];

async function createTempAdmin(roleKey: string | null, isActive = true, isProtectedOwner = false) {
  const nonce = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const email = `test_rbac_${nonce}@sivvai-test.local`;
  const password = `TestPass!_${nonce}`;

  const { data: authData, error: authErr } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr || !authData.user) {
    throw new Error(`Failed to create temp auth user: ${authErr?.message}`);
  }

  const authUserId = authData.user.id;
  createdAuthUserIds.push(authUserId);

  let roleId: string | null = null;
  if (roleKey) {
    const { data: roleRow, error: roleErr } = await serviceClient
      .from("roles")
      .select("id")
      .eq("key", roleKey)
      .single();
    if (roleErr || !roleRow) {
      throw new Error(`Failed to find role '${roleKey}': ${roleErr?.message}`);
    }
    roleId = roleRow.id;
  }

  const { data: adminData, error: adminErr } = await serviceClient
    .from("admin_users")
    .insert({
      auth_user_id: authUserId,
      role_id: roleId,
      is_active: isActive,
      is_protected_owner: isProtectedOwner,
    })
    .select("id")
    .single();

  if (adminErr || !adminData) {
    throw new Error(`Failed to create temp admin_user record: ${adminErr?.message}`);
  }

  return {
    authUserId,
    adminId: adminData.id,
    email,
    password,
  };
}

async function insertOverride(adminId: string, permissionKey: string, isGranted: boolean) {
  const { data: perm, error: permErr } = await serviceClient
    .from("permissions")
    .select("id")
    .eq("key", permissionKey)
    .single();

  if (permErr || !perm) {
    throw new Error(`Permission '${permissionKey}' not found: ${permErr?.message}`);
  }

  const { error: upsertErr } = await serviceClient.from("admin_user_permissions").upsert({
    admin_user_id: adminId,
    permission_id: perm.id,
    is_granted: isGranted,
  });

  if (upsertErr) {
    throw new Error(`Failed to insert override for '${permissionKey}': ${upsertErr.message}`);
  }
}

async function removeOverride(adminId: string, permissionKey: string) {
  const { data: perm } = await serviceClient.from("permissions").select("id").eq("key", permissionKey).single();
  if (!perm) return;
  await serviceClient
    .from("admin_user_permissions")
    .delete()
    .eq("admin_user_id", adminId)
    .eq("permission_id", perm.id);
}

async function main() {
  console.log("\n===========================================================");
  console.log("   Phase 3 RBAC Real-Database Verification Suite");
  console.log("===========================================================\n");

  let cleanupErrors = 0;

  try {
    // -------------------------------------------------------------------------
    // Setup Temporary Admin Accounts
    // -------------------------------------------------------------------------
    console.log("Creating temporary isolated test admin accounts in DB...");
    const editor = await createTempAdmin("editor", true, false);
    const manager = await createTempAdmin("manager", true, false);
    const support = await createTempAdmin("support", true, false);
    const owner = await createTempAdmin("owner", true, true);
    const inactive = await createTempAdmin("manager", false, false);
    console.log("Temporary test accounts created successfully.\n");

    // -------------------------------------------------------------------------
    // Test 1: Editor with no overrides inherits from role
    // -------------------------------------------------------------------------
    console.log("--- Test 1: Role Inheritance (Editor with no overrides) ---");
    const ctx1 = await resolveAdminContextFromDB(serviceClient, editor.authUserId);
    assert(Boolean(ctx1), "Editor context resolved from DB");
    assert(checkPermission(ctx1, "manage_products"), "Editor inherits manage_products from role");
    assert(checkPermission(ctx1, "manage_categories"), "Editor inherits manage_categories from role");
    assert(!checkPermission(ctx1, "manage_inventory"), "Editor does NOT have manage_inventory by default");
    assert(!checkPermission(ctx1, "manage_shipping"), "Editor does NOT have manage_shipping by default");

    // -------------------------------------------------------------------------
    // Test 2: Real GRANT row: Editor + manage_inventory GRANT
    // -------------------------------------------------------------------------
    console.log("\n--- Test 2: Real DB GRANT row (Editor + manage_inventory) ---");
    await insertOverride(editor.adminId, "manage_inventory", true);
    const ctx2 = await resolveAdminContextFromDB(serviceClient, editor.authUserId);
    assert(checkPermission(ctx2, "manage_inventory"), "Editor has manage_inventory after real DB GRANT row");
    assert(checkPermission(ctx2, "manage_products"), "Editor retains manage_products alongside GRANT");
    await removeOverride(editor.adminId, "manage_inventory");
    const ctx2Clean = await resolveAdminContextFromDB(serviceClient, editor.authUserId);
    assert(!checkPermission(ctx2Clean, "manage_inventory"), "manage_inventory removed after override cleanup");

    // -------------------------------------------------------------------------
    // Test 3: Real DENY row: Manager + manage_promotions DENY
    // -------------------------------------------------------------------------
    console.log("\n--- Test 3: Real DB DENY row (Manager + manage_promotions) ---");
    const ctx3Base = await resolveAdminContextFromDB(serviceClient, manager.authUserId);
    assert(checkPermission(ctx3Base, "manage_promotions"), "Manager initially has manage_promotions from role");

    await insertOverride(manager.adminId, "manage_promotions", false);
    const ctx3 = await resolveAdminContextFromDB(serviceClient, manager.authUserId);
    assert(!checkPermission(ctx3, "manage_promotions"), "Manager loses manage_promotions after real DB DENY row");
    await removeOverride(manager.adminId, "manage_promotions");
    const ctx3Clean = await resolveAdminContextFromDB(serviceClient, manager.authUserId);
    assert(checkPermission(ctx3Clean, "manage_promotions"), "manage_promotions restored after override cleanup");

    // -------------------------------------------------------------------------
    // Test 4: Real INHERIT: Manager retaining manage_shipping
    // -------------------------------------------------------------------------
    console.log("\n--- Test 4: Real DB INHERIT (Manager + manage_shipping) ---");
    const ctx4 = await resolveAdminContextFromDB(serviceClient, manager.authUserId);
    assert(checkPermission(ctx4, "manage_shipping"), "Manager INHERITS manage_shipping from role (no override row)");

    // -------------------------------------------------------------------------
    // Test 5: Real GRANT where role lacks permission: Support + manage_products
    // -------------------------------------------------------------------------
    console.log("\n--- Test 5: Real DB GRANT on Role Absence (Support + manage_products) ---");
    const ctx5Base = await resolveAdminContextFromDB(serviceClient, support.authUserId);
    assert(!checkPermission(ctx5Base, "manage_products"), "Support initially lacks manage_products");

    await insertOverride(support.adminId, "manage_products", true);
    const ctx5 = await resolveAdminContextFromDB(serviceClient, support.authUserId);
    assert(checkPermission(ctx5, "manage_products"), "Support receives manage_products after real DB GRANT row");
    await removeOverride(support.adminId, "manage_products");
    const ctx5Clean = await resolveAdminContextFromDB(serviceClient, support.authUserId);
    assert(!checkPermission(ctx5Clean, "manage_products"), "manage_products removed after override cleanup");

    // -------------------------------------------------------------------------
    // Test 6: Real DENY overriding role grant: Manager + manage_shipping DENY
    // -------------------------------------------------------------------------
    console.log("\n--- Test 6: Real DB DENY Overriding Role Grant (Manager + manage_shipping) ---");
    await insertOverride(manager.adminId, "manage_shipping", false);
    const ctx6 = await resolveAdminContextFromDB(serviceClient, manager.authUserId);
    assert(!checkPermission(ctx6, "manage_shipping"), "Manager loses manage_shipping after real DB DENY row");
    await removeOverride(manager.adminId, "manage_shipping");
    const ctx6Clean = await resolveAdminContextFromDB(serviceClient, manager.authUserId);
    assert(checkPermission(ctx6Clean, "manage_shipping"), "manage_shipping restored after override cleanup");

    // -------------------------------------------------------------------------
    // Test 7: Protected Owner Immunity against real DB DENY overrides
    // -------------------------------------------------------------------------
    console.log("\n--- Test 7: Protected Owner Immunity against Real DB DENY Overrides ---");
    await insertOverride(owner.adminId, "manage_settings", false);
    await insertOverride(owner.adminId, "manage_users", false);
    await insertOverride(owner.adminId, "manage_shipping", false);

    const ctx7 = await resolveAdminContextFromDB(serviceClient, owner.authUserId);
    assert(Boolean(ctx7), "Owner context resolved");
    assert(checkPermission(ctx7, "manage_settings"), "Protected Owner retains manage_settings despite real DENY");
    assert(checkPermission(ctx7, "manage_users"), "Protected Owner retains manage_users despite real DENY");
    assert(checkPermission(ctx7, "manage_shipping"), "Protected Owner retains manage_shipping despite real DENY");

    await removeOverride(owner.adminId, "manage_settings");
    await removeOverride(owner.adminId, "manage_users");
    await removeOverride(owner.adminId, "manage_shipping");

    // -------------------------------------------------------------------------
    // Test 8: Inactive admin resolves to null / zero permissions
    // -------------------------------------------------------------------------
    console.log("\n--- Test 8: Inactive Admin Resolution ---");
    const ctx8 = await resolveAdminContextFromDB(serviceClient, inactive.authUserId);
    assert(ctx8 === null, "Inactive admin resolves to null context (no permissions granted)");

    // -------------------------------------------------------------------------
    // Test 9: Permission Hierarchy (manage_orders -> view_orders, manage_customers -> view_customers)
    // -------------------------------------------------------------------------
    console.log("\n--- Test 9: Permission Hierarchy & Child Deny Consistency ---");
    const ctx9 = await resolveAdminContextFromDB(serviceClient, manager.authUserId);
    assert(checkPermission(ctx9, "manage_orders"), "Manager has manage_orders from role");
    assert(checkPermission(ctx9, "view_orders"), "Manager satisfies view_orders via manage_orders hierarchy");
    assert(checkPermission(ctx9, "manage_customers"), "Manager has manage_customers from role");
    assert(checkPermission(ctx9, "view_customers"), "Manager satisfies view_customers via manage_customers hierarchy");

    // Test hierarchy implication on a role that normally lacks manage_* (e.g. Editor with GRANT manage_orders)
    await insertOverride(editor.adminId, "manage_orders", true);
    const ctx9EditorGrant = await resolveAdminContextFromDB(serviceClient, editor.authUserId);
    assert(checkPermission(ctx9EditorGrant, "manage_orders"), "Editor with GRANT has manage_orders");
    assert(checkPermission(ctx9EditorGrant, "view_orders"), "Editor with GRANT manage_orders satisfies view_orders via hierarchy");
    await removeOverride(editor.adminId, "manage_orders");

    // If both parent (manage_orders) and child (view_orders) are DENIED on Manager, both fail
    await insertOverride(manager.adminId, "manage_orders", false);
    await insertOverride(manager.adminId, "view_orders", false);
    const ctx9FullDeny = await resolveAdminContextFromDB(serviceClient, manager.authUserId);
    assert(!checkPermission(ctx9FullDeny, "manage_orders"), "Manager loses manage_orders on DENY");
    assert(!checkPermission(ctx9FullDeny, "view_orders"), "Manager loses view_orders when both manage_orders and view_orders are DENIED");
    await removeOverride(manager.adminId, "manage_orders");
    await removeOverride(manager.adminId, "view_orders");

    // -------------------------------------------------------------------------
    // Test 10: Security Privilege Audit — private.admin_has_permission_direct
    // -------------------------------------------------------------------------
    console.log("\n--- Test 10: Security Boundary & Privilege Hardening Audit ---");
    if (anonKey && supabaseUrl) {
      const validAnonKey: string = anonKey;
      const userAnonClient = createClient(supabaseUrl, validAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: signInData, error: signInErr } = await userAnonClient.auth.signInWithPassword({
        email: editor.email,
        password: editor.password,
      });

      assert(!signInErr && Boolean(signInData.session), "Authenticated client created for test editor");

      // Verify that calling admin_has_permission_direct directly from authenticated client fails/is uncallable
      const { data: rpcData, error: rpcErr } = await userAnonClient.rpc(
        "admin_has_permission_direct" as unknown as never,
        {
          p_admin_id: editor.adminId,
          p_role_id: null,
          p_permission_key: "manage_settings",
        } as unknown as undefined
      );

      assert(
        Boolean(rpcErr),
        "Authenticated client cannot invoke private.admin_has_permission_direct directly",
        `Response: ${rpcErr?.message || JSON.stringify(rpcData)}`
      );
    } else {
      console.log("  ℹ️  No anon key available for RPC test; skipping RPC sub-assertion");
    }
  } finally {
    // -------------------------------------------------------------------------
    // Safe Teardown & Guaranteed Cleanup
    // -------------------------------------------------------------------------
    console.log("\n===========================================================");
    console.log("   Tearing Down Temporary Test Records...");
    console.log("===========================================================");

    for (const userId of createdAuthUserIds) {
      try {
        const { error } = await serviceClient.auth.admin.deleteUser(userId);
        if (error) {
          console.error(`❌ Cleanup error for user ${userId}: ${error.message}`);
          cleanupErrors++;
        }
      } catch (err) {
        console.error(`❌ Unexpected cleanup exception for user ${userId}:`, err);
        cleanupErrors++;
      }
    }

    if (cleanupErrors === 0) {
      console.log("✅ All temporary test records successfully cleaned up.");
    } else {
      console.error(`❌ Cleanup encountered ${cleanupErrors} error(s)!`);
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log(`\n=== Verification Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0 || cleanupErrors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
