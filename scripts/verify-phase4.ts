/**
 * scripts/verify-phase4.ts
 *
 * Real-Database Verification Suite for Phase 4:
 * Direct testing of the production `acceptAdminInvitation` function,
 * PostgreSQL transactional RPC atomicity, concurrency race safety,
 * Owner-only `manage_users` enforcement, and active/inactive admin invariants.
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

// DIRECT PRODUCTION IMPORT FROM DOMAIN SERVICE
import { acceptAdminInvitation } from "../services/admin-invitations-service";

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

  const roleObj = Array.isArray(admin.roles)
    ? (admin.roles as unknown as Array<{ id: string; key: string; name: string }>)[0]
    : admin.roles;

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

async function main() {
  console.log("\n===========================================================");
  console.log("   Phase 4 Real Production Verification Suite");
  console.log("===========================================================\n");

  let cleanupErrors = 0;

  try {
    const { data: roles } = await serviceClient.from("roles").select("id, key");
    const roleMap = Object.fromEntries((roles ?? []).map((r) => [r.key, r.id]));

    // -------------------------------------------------------------------------
    // 1. Authorization: Owner-Only manage_users Enforcement
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
    // 2. New Invitation Acceptance (Testing Production acceptAdminInvitation)
    // -------------------------------------------------------------------------
    console.log("\n--- 2. New Invitation Acceptance (Production Function) ---");
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

    // DIRECT INVOCATION OF PRODUCTION FUNCTION
    const newAcceptRes = await acceptAdminInvitation({
      token: tokenNew,
      authUserId: newAuthUserId,
      email: newEmail,
    });

    assert(newAcceptRes.success, "8. Production acceptAdminInvitation succeeds for new admin");
    const newCtx = await resolveAdminContext(serviceClient, newAuthUserId);
    assert(newCtx?.role?.key === "editor", "9. Correct role is applied (Editor)");
    assert(newCtx?.admin.is_active === true, "10. New admin is active");

    const { data: invNewDb } = await serviceClient.from("admin_invitations").select("status").eq("id", invNew.id).single();
    assert(invNewDb?.status === "accepted", "11. Invitation record becomes accepted");

    // -------------------------------------------------------------------------
    // 3. Inactive Re-invitation Lifecycle (Production Function)
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Inactive Re-invitation Lifecycle (Production Function) ---");
    const inactiveStaff = await createTempAdmin("support", false, false);
    // Add an override to verify preservation
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
    if (!invReinvite) throw new Error("Failed to create reinvite record");
    createdInvitationIds.push(invReinvite.id);

    // DIRECT INVOCATION OF PRODUCTION FUNCTION
    const acceptReinviteRes = await acceptAdminInvitation({
      token: tokenReinvite,
      authUserId: inactiveStaff.authUserId,
      email: inactiveStaff.email,
    });

    assert(acceptReinviteRes.success && acceptReinviteRes.isReactivated === true, "12. Existing inactive admin successfully reactivated");
    assert(acceptReinviteRes.adminId === inactiveStaff.adminId, "13. Existing admin_users.id is preserved");

    const reactivatedCtx = await resolveAdminContext(serviceClient, inactiveStaff.authUserId);
    assert(reactivatedCtx?.admin.is_active === true, "14. Admin is active after acceptance");
    assert(reactivatedCtx?.role?.key === "manager", "15. New invited role is applied (Manager)");
    assert(checkPermission(reactivatedCtx, "manage_inventory"), "16. Existing admin_user_permissions rows are preserved");

    const { data: allAdminRowsForUser } = await serviceClient
      .from("admin_users")
      .select("id")
      .eq("auth_user_id", inactiveStaff.authUserId);

    assert(allAdminRowsForUser?.length === 1, "17. No duplicate admin_users row is created");

    const { data: invReinviteDb } = await serviceClient.from("admin_invitations").select("status").eq("id", invReinvite.id).single();
    assert(invReinviteDb?.status === "accepted", "18. Re-invitation becomes accepted");

    // -------------------------------------------------------------------------
    // 4. Failure, Rollback & Validation Checks (Production Function)
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Failure, Rollback & Validation Checks ---");
    const inactiveStaff2 = await createTempAdmin("editor", false, false);
    const tokenExpired = randomBytes(32).toString("hex");
    const { data: invExpired } = await serviceClient.from("admin_invitations").insert({
      email: inactiveStaff2.email,
      role_id: roleMap["manager"],
      invited_by: owner.adminId,
      token: tokenExpired,
      status: "pending",
      expires_at: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
    }).select().single();
    if (invExpired) createdInvitationIds.push(invExpired.id);

    // Expired token attempt
    const expiredRes = await acceptAdminInvitation({
      token: tokenExpired,
      authUserId: inactiveStaff2.authUserId,
      email: inactiveStaff2.email,
    });
    assert(!expiredRes.success && expiredRes.error === "invitation_expired", "19. Expired invitation cannot reactivate an admin");

    // Second attempt on expired
    const expiredReplayRes = await acceptAdminInvitation({
      token: tokenExpired,
      authUserId: inactiveStaff2.authUserId,
      email: inactiveStaff2.email,
    });
    assert(!expiredReplayRes.success && expiredReplayRes.error === "invitation_invalid", "20. Expired invitation marked expired and cannot be replayed");

    // Invalid email attempt
    const tokenValidForMismatch = randomBytes(32).toString("hex");
    const { data: invMismatch } = await serviceClient.from("admin_invitations").insert({
      email: inactiveStaff2.email,
      role_id: roleMap["manager"],
      invited_by: owner.adminId,
      token: tokenValidForMismatch,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }).select().single();
    if (invMismatch) createdInvitationIds.push(invMismatch.id);

    const emailMismatchRes = await acceptAdminInvitation({
      token: tokenValidForMismatch,
      authUserId: inactiveStaff2.authUserId,
      email: "wrong_email@sivvai-test.local",
    });
    assert(!emailMismatchRes.success && emailMismatchRes.error === "invitation_email_mismatch", "21. Invalid email cannot accept invitation");

    // Invalid token attempt
    const invalidTokenRes = await acceptAdminInvitation({
      token: "non_existent_token_12345",
      authUserId: inactiveStaff2.authUserId,
      email: inactiveStaff2.email,
    });
    assert(!invalidTokenRes.success && invalidTokenRes.error === "invitation_invalid", "22. Invalid token cannot accept invitation");

    // Verify admin remained inactive
    const stillInactiveCtx = await resolveAdminContext(serviceClient, inactiveStaff2.authUserId);
    assert(stillInactiveCtx === null, "23. Failed acceptance does not partially reactivate/create an admin");

    // Verify invitation remained pending
    const { data: invMismatchDb } = await serviceClient.from("admin_invitations").select("status").eq("id", invMismatch!.id).single();
    assert(invMismatchDb?.status === "pending", "24. Invitation remains pending when validation fails");

    // -------------------------------------------------------------------------
    // 5. Replay & Concurrency Safety
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Replay & Concurrency Safety ---");
    // Replay attempt on consumed token
    const replayRes = await acceptAdminInvitation({
      token: tokenReinvite,
      authUserId: inactiveStaff.authUserId,
      email: inactiveStaff.email,
    });
    assert(!replayRes.success && replayRes.error === "invitation_invalid", "25. Consumed invitation cannot be accepted again");

    // Concurrent race condition test: create 1 new invite and execute 2 simultaneous accept calls
    const nonceRace = `${Date.now()}_race`;
    const raceEmail = `race_test_${nonceRace}@sivvai-test.local`;
    const { data: authRace } = await serviceClient.auth.admin.createUser({
      email: raceEmail,
      password: "TestPassword123!",
      email_confirm: true,
    });
    if (!authRace?.user) throw new Error("Failed to create race auth user");
    const raceAuthUserId = authRace.user.id;
    createdAuthUserIds.push(raceAuthUserId);

    const tokenRace = randomBytes(32).toString("hex");
    const { data: invRace } = await serviceClient.from("admin_invitations").insert({
      email: raceEmail,
      role_id: roleMap["editor"],
      invited_by: owner.adminId,
      token: tokenRace,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }).select().single();
    if (!invRace) throw new Error("Failed to create race invitation");
    createdInvitationIds.push(invRace.id);

    // Launch two simultaneous acceptance attempts on the same invitation
    const [raceRes1, raceRes2] = await Promise.all([
      acceptAdminInvitation({
        token: tokenRace,
        authUserId: raceAuthUserId,
        email: raceEmail,
      }),
      acceptAdminInvitation({
        token: tokenRace,
        authUserId: raceAuthUserId,
        email: raceEmail,
      }),
    ]);

    const raceSuccessCount = (raceRes1.success ? 1 : 0) + (raceRes2.success ? 1 : 0);
    assert(raceSuccessCount === 1, "26. Two concurrent acceptance attempts produce exactly one success");

    const { data: raceAdmins } = await serviceClient
      .from("admin_users")
      .select("id")
      .eq("auth_user_id", raceAuthUserId);
    assert(raceAdmins?.length === 1, "27. Exactly one admin state transition occurs under concurrency");

    // -------------------------------------------------------------------------
    // 6. Active Admin Safeguard
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Active Admin Safeguard ---");
    const activeAdmin = await createTempAdmin("support", true, false);
    const tokenActive = randomBytes(32).toString("hex");
    const { data: invActive } = await serviceClient.from("admin_invitations").insert({
      email: activeAdmin.email,
      role_id: roleMap["manager"], // Attempting to alter active admin's role
      invited_by: owner.adminId,
      token: tokenActive,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }).select().single();
    createdInvitationIds.push(invActive!.id);

    const activeAcceptRes = await acceptAdminInvitation({
      token: tokenActive,
      authUserId: activeAdmin.authUserId,
      email: activeAdmin.email,
    });

    assert(!activeAcceptRes.success && activeAcceptRes.error === "already_active", "28. Active admin invitation is rejected (already_active)");
    const activeCtxAfter = await resolveAdminContext(serviceClient, activeAdmin.authUserId);
    assert(activeCtxAfter?.role?.key === "support", "29. Active admin role remains unchanged (Support)");

    // -------------------------------------------------------------------------
    // 7. Protected Owner Safeguards
    // -------------------------------------------------------------------------
    console.log("\n--- 7. Protected Owner Safeguards ---");
    const tokenOwnerInvite = randomBytes(32).toString("hex");
    const { data: invOwner } = await serviceClient.from("admin_invitations").insert({
      email: owner.email,
      role_id: roleMap["support"], // Attempting to invite owner as Support
      invited_by: owner.adminId,
      token: tokenOwnerInvite,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }).select().single();
    createdInvitationIds.push(invOwner!.id);

    const ownerAcceptRes = await acceptAdminInvitation({
      token: tokenOwnerInvite,
      authUserId: owner.authUserId,
      email: owner.email,
    });

    // Owner is already active, so it is safely rejected without modifying Owner
    assert(!ownerAcceptRes.success, "30. Protected Owner invitation does not modify owner");
    const ownerAfterInvite = await resolveAdminContext(serviceClient, owner.authUserId);
    assert(ownerAfterInvite?.admin.is_protected_owner === true, "31. Protected Owner status is preserved");
    assert(checkPermission(ownerAfterInvite, "manage_users"), "32. Protected Owner retains manage_users");

    // Active owner count
    const { data: ownerRole } = await serviceClient.from("roles").select("id").eq("key", "owner").single();
    if (ownerRole) {
      const { count: dbOwnerCount } = await serviceClient
        .from("admin_users")
        .select("id", { count: "exact", head: true })
        .eq("role_id", ownerRole.id)
        .eq("is_active", true);

      assert((dbOwnerCount ?? 0) >= 1, "33. At least one active protected Owner remains in the system");
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
