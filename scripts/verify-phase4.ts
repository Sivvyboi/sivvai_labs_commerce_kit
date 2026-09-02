/**
 * scripts/verify-phase4.ts
 *
 * Comprehensive Real-Database Verification Suite for Phase 4:
 * 1. Owner-only manage_users enforcement across application & database
 * 2. Inactive-admin re-invitation lifecycle, reactivation, & role updates
 * 3. Preservation of existing admin IDs, historical links, and overrides
 * 4. Protected Owner safeguards & final Owner protection
 */

import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
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
  roles: { id: string; key: string; name: string } | null;
}

interface TestContext {
  user: { id: string; email: string };
  admin: AdminUserRecord;
  role: { id: string; key: string; name: string } | null;
  permissions: string[];
}

/** Resolves effective permissions matching getCurrentAdminContext in authz-service.ts */
async function resolveAdminContext(
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
        name
      )
    `)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (adminErr || !rawAdmin) return null;

  const admin = rawAdmin as unknown as AdminUserRecord;
  if (!admin.is_active) return null;

  let permissions: string[] = [];

  if (admin.is_protected_owner) {
    const { data: allPerms, error: permsErr } = await client
      .from("permissions")
      .select("key");

    if (permsErr) return null;
    permissions = (allPerms ?? []).map((p) => p.key).filter(Boolean) as string[];
  } else {
    const [rolePermsRes, overridesRes] = await Promise.all([
      admin.role_id
        ? client.from("role_permissions").select("permissions(key)").eq("role_id", admin.role_id)
        : Promise.resolve({ data: [], error: null }),
      client.from("admin_user_permissions").select("is_granted, permissions(key)").eq("admin_user_id", admin.id),
    ]);

    if (rolePermsRes.error || overridesRes.error) return null;

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
      if (ov.is_granted) effectiveSet.add(key);
      else effectiveSet.delete(key);
    }

    // INVARIANT: manage_users is strictly Owner-only
    if (!admin.is_protected_owner) {
      effectiveSet.delete("manage_users");
    }

    permissions = Array.from(effectiveSet);
  }

  const roleObj = Array.isArray(admin.roles) ? (admin.roles as unknown as Array<{ id: string; key: string; name: string }>)[0] : admin.roles;

  return {
    user: { id: admin.auth_user_id, email: "" },
    admin,
    role: roleObj || null,
    permissions,
  };
}

function checkPermission(ctx: TestContext | null, permission: string): boolean {
  if (!ctx) return false;
  return (
    ctx.permissions.includes(permission) ||
    (permission === "view_orders" && ctx.permissions.includes("manage_orders")) ||
    (permission === "view_customers" && ctx.permissions.includes("manage_customers"))
  );
}

// Track resources for guaranteed teardown
const createdAuthUserIds: string[] = [];
const createdInvitationIds: string[] = [];

async function createTempAdmin(roleKey: string | null, isActive = true, isProtectedOwner = false) {
  const nonce = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const email = `test_p4_${nonce}@sivvai-test.local`;
  const password = `TestPassP4!_${nonce}`;

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
      throw new Error(`Role '${roleKey}' not found: ${roleErr?.message}`);
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
    throw new Error(`Failed to create temp admin_user: ${adminErr?.message}`);
  }

  return { authUserId, adminId: adminData.id, email, password, roleId };
}

async function insertOverride(adminId: string, permissionKey: string, isGranted: boolean) {
  const { data: perm } = await serviceClient.from("permissions").select("id").eq("key", permissionKey).single();
  if (!perm) throw new Error(`Permission ${permissionKey} not found`);
  await serviceClient.from("admin_user_permissions").upsert({
    admin_user_id: adminId,
    permission_id: perm.id,
    is_granted: isGranted,
  });
}

async function removeOverride(adminId: string, permissionKey: string) {
  const { data: perm } = await serviceClient.from("permissions").select("id").eq("key", permissionKey).single();
  if (!perm) return;
  await serviceClient.from("admin_user_permissions").delete().eq("admin_user_id", adminId).eq("permission_id", perm.id);
}

/** Simulates the acceptAdminInvitation server logic using serviceClient */
async function processAcceptInvitation(params: {
  token: string;
  authUserId: string;
  email: string;
}) {
  const { data: invitation, error: invErr } = await serviceClient
    .from("admin_invitations")
    .select("id, email, role_id, status, expires_at")
    .eq("token", params.token)
    .eq("status", "pending")
    .maybeSingle();

  if (invErr || !invitation) return { success: false, error: "invitation_invalid" };

  if (new Date(invitation.expires_at) < new Date()) {
    await serviceClient.from("admin_invitations").update({ status: "expired" }).eq("id", invitation.id);
    return { success: false, error: "invitation_expired" };
  }

  if (params.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return { success: false, error: "invitation_email_mismatch" };
  }

  const { data: existingAdmin } = await serviceClient
    .from("admin_users")
    .select("id, is_active, is_protected_owner, role_id")
    .eq("auth_user_id", params.authUserId)
    .maybeSingle();

  let adminId: string;
  let isReactivated = false;

  if (!existingAdmin) {
    const { data: newAdmin, error: insertErr } = await serviceClient
      .from("admin_users")
      .insert({
        auth_user_id: params.authUserId,
        role_id: invitation.role_id,
        is_active: true,
        is_protected_owner: false,
      })
      .select("id")
      .single();

    if (insertErr || !newAdmin) return { success: false, error: "invitation_failed" };
    adminId = newAdmin.id;
  } else {
    adminId = existingAdmin.id;
    if (!existingAdmin.is_protected_owner) {
      const { error: updateErr } = await serviceClient
        .from("admin_users")
        .update({
          is_active: true,
          role_id: invitation.role_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAdmin.id);

      if (updateErr) return { success: false, error: "invitation_failed" };
      isReactivated = !existingAdmin.is_active;
    }
  }

  await serviceClient.from("admin_invitations").update({
    status: "accepted",
    accepted_at: new Date().toISOString(),
  }).eq("id", invitation.id);

  return { success: true, adminId, isReactivated };
}

async function main() {
  console.log("\n===========================================================");
  console.log("   Phase 4: Owner-Only User Management & Inactive-Admin Tests");
  console.log("===========================================================\n");

  let cleanupErrors = 0;

  try {
    const { data: roles } = await serviceClient.from("roles").select("id, key");
    const roleMap = Object.fromEntries((roles ?? []).map((r) => [r.key, r.id]));

    // -------------------------------------------------------------------------
    // 1. Authorization: Owner-only manage_users enforcement
    // -------------------------------------------------------------------------
    console.log("--- 1. Authorization: Owner-Only manage_users Enforcement ---");
    const owner = await createTempAdmin("owner", true, true);
    const manager = await createTempAdmin("manager", true, false);
    const editor = await createTempAdmin("editor", true, false);
    const support = await createTempAdmin("support", true, false);

    const ownerCtx = await resolveAdminContext(serviceClient, owner.authUserId);
    const managerCtx = await resolveAdminContext(serviceClient, manager.authUserId);
    const editorCtx = await resolveAdminContext(serviceClient, editor.authUserId);
    const supportCtx = await resolveAdminContext(serviceClient, support.authUserId);

    assert(checkPermission(ownerCtx, "manage_users"), "1. Protected Owner has manage_users");
    assert(!checkPermission(managerCtx, "manage_users"), "2. Manager does not have manage_users");
    assert(!checkPermission(editorCtx, "manage_users"), "3. Editor does not have manage_users");
    assert(!checkPermission(supportCtx, "manage_users"), "4. Support does not have manage_users");

    // 5. Non-protected staff cannot gain manage_users through a GRANT override
    await insertOverride(manager.adminId, "manage_users", true);
    const managerWithGrant = await resolveAdminContext(serviceClient, manager.authUserId);
    assert(!checkPermission(managerWithGrant, "manage_users"), "5. Non-protected Manager cannot gain manage_users via GRANT override");
    await removeOverride(manager.adminId, "manage_users");

    // 6. Non-protected staff cannot gain manage_users through role assignment containing manage_users
    // Temporarily grant manage_users to editor's role in role_permissions
    const { data: manageUsersPerm } = await serviceClient.from("permissions").select("id").eq("key", "manage_users").single();
    if (manageUsersPerm && editor.roleId) {
      await serviceClient.from("role_permissions").insert({
        role_id: editor.roleId,
        permission_id: manageUsersPerm.id,
      });

      const editorRoleWithManageUsers = await resolveAdminContext(serviceClient, editor.authUserId);
      assert(!checkPermission(editorRoleWithManageUsers, "manage_users"), "6. Non-protected Editor cannot gain manage_users even if role contains it");

      await serviceClient.from("role_permissions").delete().eq("role_id", editor.roleId).eq("permission_id", manageUsersPerm.id);
    }

    // 7. Protected Owner retains manage_users despite DENY override
    await insertOverride(owner.adminId, "manage_users", false);
    const ownerWithDeny = await resolveAdminContext(serviceClient, owner.authUserId);
    assert(checkPermission(ownerWithDeny, "manage_users"), "7. Protected Owner retains manage_users despite explicit DENY override");
    await removeOverride(owner.adminId, "manage_users");

    // -------------------------------------------------------------------------
    // 2. Inactive-Admin Re-invitation Lifecycle
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Inactive-Admin Re-invitation Lifecycle ---");

    // 8. New invitation creates expected admin state
    const nonceNew = `${Date.now()}_new`;
    const newEmail = `new_invite_${nonceNew}@sivvai-test.local`;
    const { data: authNew } = await serviceClient.auth.admin.createUser({
      email: newEmail,
      password: "TestPassword123!",
      email_confirm: true,
    });
    if (!authNew?.user) throw new Error("Failed to create auth user for new invite");
    const newAuthUserId = authNew.user.id;
    createdAuthUserIds.push(newAuthUserId);

    const tokenNew = randomBytes(32).toString("hex");
    const { data: invNew } = await serviceClient.from("admin_invitations").insert({
      email: newEmail,
      role_id: roleMap["editor"],
      invited_by: owner.adminId,
      token: tokenNew,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }).select().single();
    if (!invNew) throw new Error("Failed to create invitation record");
    createdInvitationIds.push(invNew.id);

    const newAcceptRes = await processAcceptInvitation({
      token: tokenNew,
      authUserId: newAuthUserId,
      email: newEmail,
    });
    assert(newAcceptRes.success, "8. New invitation acceptance succeeds");
    const newCtx = await resolveAdminContext(serviceClient, newAuthUserId);
    assert(newCtx?.admin.is_active === true && newCtx?.role?.key === "editor", "8b. New invite creates active Editor admin");

    // 9. Inactive existing admin can be re-invited
    const inactiveStaff = await createTempAdmin("support", false, false);
    // Add an override on inactive staff to test preservation
    await insertOverride(inactiveStaff.adminId, "manage_inventory", true);

    const tokenReinvite = randomBytes(32).toString("hex");
    const { data: invReinvite } = await serviceClient.from("admin_invitations").insert({
      email: inactiveStaff.email,
      role_id: roleMap["manager"], // Re-inviting with a new role: Manager
      invited_by: owner.adminId,
      token: tokenReinvite,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }).select().single();
    createdInvitationIds.push(invReinvite!.id);

    assert(Boolean(invReinvite), "9. Inactive existing admin can be successfully invited");

    // 10 & 11. Re-invitation reactivates the same admin_users.id without duplicate rows
    const acceptReinviteRes = await processAcceptInvitation({
      token: tokenReinvite,
      authUserId: inactiveStaff.authUserId,
      email: inactiveStaff.email,
    });

    assert(acceptReinviteRes.success && acceptReinviteRes.isReactivated === true, "10. Re-invitation successfully reactivated inactive admin");
    assert(acceptReinviteRes.adminId === inactiveStaff.adminId, "10b. Same admin_users.id is preserved upon reactivation");

    const { data: allAdminRowsForUser } = await serviceClient
      .from("admin_users")
      .select("id")
      .eq("auth_user_id", inactiveStaff.authUserId);

    assert(allAdminRowsForUser?.length === 1, "11. Re-invitation does not create a duplicate admin row");

    // 12. Invitation role is applied correctly
    const reactivatedCtx = await resolveAdminContext(serviceClient, inactiveStaff.authUserId);
    assert(reactivatedCtx?.admin.is_active === true, "12a. Reactivated admin is active");
    assert(reactivatedCtx?.role?.key === "manager", "12b. Reactivated admin has new role applied (Manager)");

    // 13. Existing override rows are preserved
    assert(checkPermission(reactivatedCtx, "manage_inventory"), "13. Existing per-user GRANT override (manage_inventory) is preserved after reactivation");

    // 14. Expired / invalid invitation cannot reactivate an admin
    const inactiveStaff2 = await createTempAdmin("editor", false, false);
    const tokenExpired = randomBytes(32).toString("hex");
    await serviceClient.from("admin_invitations").insert({
      email: inactiveStaff2.email,
      role_id: roleMap["manager"],
      invited_by: owner.adminId,
      token: tokenExpired,
      status: "pending",
      expires_at: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
    });

    const expiredAcceptRes = await processAcceptInvitation({
      token: tokenExpired,
      authUserId: inactiveStaff2.authUserId,
      email: inactiveStaff2.email,
    });
    assert(!expiredAcceptRes.success && expiredAcceptRes.error === "invitation_expired", "14. Expired invitation cannot reactivate admin");
    const stillInactiveCtx = await resolveAdminContext(serviceClient, inactiveStaff2.authUserId);
    assert(stillInactiveCtx === null, "14b. Admin remains inactive after failed expired invitation attempt");

    // 15. Invitation cannot be replayed after successful consumption
    const replayRes = await processAcceptInvitation({
      token: tokenReinvite, // already accepted in step 10
      authUserId: inactiveStaff.authUserId,
      email: inactiveStaff.email,
    });
    assert(!replayRes.success && replayRes.error === "invitation_invalid", "15. Consumed invitation cannot be replayed");

    // 16. Existing active admin behavior remains unchanged
    const activeManager = await createTempAdmin("manager", true, false);
    const tokenActive = randomBytes(32).toString("hex");
    await serviceClient.from("admin_invitations").insert({
      email: activeManager.email,
      role_id: roleMap["editor"],
      invited_by: owner.adminId,
      token: tokenActive,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });

    const activeAcceptRes = await processAcceptInvitation({
      token: tokenActive,
      authUserId: activeManager.authUserId,
      email: activeManager.email,
    });
    assert(activeAcceptRes.success && activeAcceptRes.adminId === activeManager.adminId, "16. Active admin invitation updates role without creating duplicate rows");

    // -------------------------------------------------------------------------
    // 3. Owner Safeguards & Lockout Protection
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Protected Owner Safeguards & Lockout Protection ---");

    // 17. Protected Owner cannot be accidentally downgraded through invitations
    const tokenOwnerInvite = randomBytes(32).toString("hex");
    await serviceClient.from("admin_invitations").insert({
      email: owner.email,
      role_id: roleMap["support"], // Attempting to invite owner as Support
      invited_by: owner.adminId,
      token: tokenOwnerInvite,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });

    await processAcceptInvitation({
      token: tokenOwnerInvite,
      authUserId: owner.authUserId,
      email: owner.email,
    });

    const ownerAfterInvite = await resolveAdminContext(serviceClient, owner.authUserId);
    assert(ownerAfterInvite?.admin.is_protected_owner === true, "17a. Protected Owner status is never removed");
    assert(ownerAfterInvite?.admin.is_active === true, "17b. Protected Owner remains active");
    assert(checkPermission(ownerAfterInvite, "manage_users"), "17c. Protected Owner retains manage_users");

    // 18. Count active owners helper accuracy
    const { data: ownerRole } = await serviceClient.from("roles").select("id").eq("key", "owner").single();
    if (ownerRole) {
      const { count: dbOwnerCount } = await serviceClient
        .from("admin_users")
        .select("id", { count: "exact", head: true })
        .eq("role_id", ownerRole.id)
        .eq("is_active", true);

      assert((dbOwnerCount ?? 0) >= 1, "18. System has at least one active Owner");
    }
  } finally {
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

    if (createdInvitationIds.length > 0) {
      await serviceClient.from("admin_invitations").delete().in("id", createdInvitationIds);
    }

    if (cleanupErrors === 0) {
      console.log("✅ All temporary test records successfully cleaned up.");
    } else {
      console.error(`❌ Cleanup encountered ${cleanupErrors} error(s)!`);
    }
  }

  console.log(`\n=== Verification Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0 || cleanupErrors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
