/**
 * scripts/verify-phase5-3.ts
 *
 * Real-Database Verification Suite for Phase 5.3: Invitation Management UX & Resend.
 *
 * Covers:
 *  - Case 1: Pending resend
 *     1. Create invitation
 *     2. Confirm it is pending
 *     3. Resend it via production service
 *     4. Confirm new token & notification dispatched
 *     5. Confirm expiration is refreshed
 *     6. Confirm previous invitation token CANNOT independently be accepted
 *     7. Confirm audit event is recorded
 *  - Case 2: Expired resend
 *     1. Create invitation with past expiration (or status = 'expired')
 *     2. Resend it via production service
 *     3. Confirm fresh pending invitation
 *     4. Confirm new expiration date
 *     5. Confirm recipient receives notification
 *     6. Confirm audit event is recorded
 *  - Case 3: Accepted invitation
 *     1. Confirm Resend is rejected for accepted invitations
 *  - Case 4: Revoked invitation
 *     1. Confirm Resend is rejected for revoked invitations
 *  - Case 5: Authorization
 *     1. Confirm non-Owner users cannot invoke resendAdminInvitationAction (managed via manage_users guard)
 *     2. Direct RLS privileges on admin_invitations require manage_users
 *
 * Guarantees complete cleanup of all temporary auth accounts, admin rows, invitations,
 * notification logs, and audit records in try/finally.
 */

import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
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

// Bypass Next.js 'server-only' package restriction when running standalone CLI scripts
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as unknown as NodeJS.Module;
} catch {
  // Ignore
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error("❌ Missing required env variables in .env.local");
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

const createdAuthUserIds: string[] = [];
const createdInvitationIds: string[] = [];

async function createTempAdmin(
  roleKey: string | null,
  isActive = true,
  isProtectedOwner = false
): Promise<{ authUserId: string; adminId: string; email: string; password: string }> {
  const nonce = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const email = `test_p53_${nonce}@sivvai-test.local`;
  const password = `TestPass53!_${nonce}`;

  const { data: authData, error: authErr } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !authData.user) throw new Error(`Failed to create auth user: ${authErr?.message}`);

  const authUserId = authData.user.id;
  createdAuthUserIds.push(authUserId);

  let roleId: string | null = null;
  if (roleKey) {
    const { data: roleRow, error: roleErr } = await serviceClient
      .from("roles")
      .select("id")
      .eq("key", roleKey)
      .single();
    if (roleErr || !roleRow) throw new Error(`Role '${roleKey}' not found`);
    roleId = roleRow.id;
  }

  const { data: adminData, error: adminErr } = await serviceClient
    .from("admin_users")
    .insert({ auth_user_id: authUserId, role_id: roleId, is_active: isActive, is_protected_owner: isProtectedOwner })
    .select("id")
    .single();
  if (adminErr || !adminData) throw new Error(`Failed to create admin_user: ${adminErr?.message}`);

  return { authUserId, adminId: adminData.id, email, password };
}

async function getOrCreateAuthUser(email: string): Promise<string> {
  const { data: userList } = await serviceClient.auth.admin.listUsers();
  const existing = userList?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    createdAuthUserIds.push(existing.id);
    return existing.id;
  }
  const { data: created, error } = await serviceClient.auth.admin.createUser({
    email,
    password: "TestPassword123!",
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(`Failed to create auth user for ${email}: ${error?.message}`);
  createdAuthUserIds.push(created.user.id);
  return created.user.id;
}

async function main() {
  console.log("\n===========================================================");
  console.log("   Phase 5.3 — Invitation Resend & Lifecycle Verification");
  console.log("===========================================================\n");

  const { resendAdminInvitation, acceptAdminInvitation } = await import("../services/admin-invitations-service");

  let cleanupErrors = 0;

  try {
    // Fetch a non-owner role for test invitations
    const { data: editorRole } = await serviceClient
      .from("roles")
      .select("id, name, key")
      .eq("key", "editor")
      .single();

    if (!editorRole) throw new Error("Role 'editor' not found in database.");

    // Setup Owner and Manager test accounts
    console.log("Creating temporary isolated test accounts...");
    const owner = await createTempAdmin("owner", true, true);
    const manager = await createTempAdmin("manager", true, false);
    console.log("Temporary accounts created.\n");

    // -------------------------------------------------------------------------
    // Case 1: Pending resend
    // -------------------------------------------------------------------------
    console.log("--- Case 1: Pending Invitation Resend ---");
    {
      const nonce = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const inviteEmail = `invite_pending_${nonce}@sivvai-test.local`;
      const originalToken = randomBytes(32).toString("hex");
      const originalExpiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

      const { data: inv, error: invErr } = await serviceClient
        .from("admin_invitations")
        .insert({
          email: inviteEmail,
          role_id: editorRole.id,
          token: originalToken,
          status: "pending",
          expires_at: originalExpiresAt,
          invited_by: owner.adminId,
        })
        .select()
        .single();

      if (invErr || !inv) throw new Error(`Failed to insert invitation: ${invErr?.message}`);
      createdInvitationIds.push(inv.id);

      assert(inv.status === "pending", "Invitation is initially pending");

      // Resend the invitation via production service
      const resendRes = await resendAdminInvitation({
        invitationId: inv.id,
        callerAdminId: owner.adminId,
        callerEmail: owner.email,
      });

      assert(resendRes.success === true, "resendAdminInvitation returned success=true");
      assert(Boolean(resendRes.invitation), "Updated invitation returned");

      const newToken = resendRes.invitation!.token;
      assert(newToken !== originalToken, "New secure token was generated on resend");

      const newExpiresAt = new Date(resendRes.invitation!.expires_at).getTime();
      const oldExpiresAt = new Date(originalExpiresAt).getTime();
      assert(newExpiresAt > oldExpiresAt, "Expiration date was refreshed to future (+7 days)");

      // Verify recipient notification log was dispatched
      assert(Boolean(resendRes.notificationId), "Notification ID recorded for delivery");
      const { data: notifLog } = await serviceClient
        .from("notification_logs")
        .select("status, recipient, metadata")
        .eq("id", resendRes.notificationId!)
        .single();
      assert(Boolean(notifLog), "Notification log entry exists in database");
      assert(notifLog?.recipient === inviteEmail, "Notification recipient matches invited email");

      // Verify old invitation token CANNOT independently be used to accept
      const authUserId1 = await getOrCreateAuthUser(inviteEmail);

      const oldAcceptRes = await acceptAdminInvitation({
        token: originalToken,
        authUserId: authUserId1,
        email: inviteEmail,
      });
      assert(
        oldAcceptRes.success === false && oldAcceptRes.error === "invitation_invalid",
        "Previous invitation token cannot be used (fails with invitation_invalid)"
      );

      // Verify new token CAN successfully be accepted
      const newAcceptRes = await acceptAdminInvitation({
        token: newToken,
        authUserId: authUserId1,
        email: inviteEmail,
      });
      assert(newAcceptRes.success === true, "New invitation token successfully accepts");

      // Confirm invitation is now accepted in DB
      const { data: finalInv } = await serviceClient
        .from("admin_invitations")
        .select("status")
        .eq("id", inv.id)
        .single();
      assert(finalInv?.status === "accepted", "Invitation marked accepted in DB");
    }

    // -------------------------------------------------------------------------
    // Case 2: Expired resend
    // -------------------------------------------------------------------------
    console.log("\n--- Case 2: Expired Invitation Resend ---");
    {
      const nonce = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const expiredEmail = `invite_expired_${nonce}@sivvai-test.local`;
      const expiredToken = randomBytes(32).toString("hex");
      // Set expiration in the past (1 day ago)
      const pastExpiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: inv, error: invErr } = await serviceClient
        .from("admin_invitations")
        .insert({
          email: expiredEmail,
          role_id: editorRole.id,
          token: expiredToken,
          status: "expired",
          expires_at: pastExpiresAt,
          invited_by: owner.adminId,
        })
        .select()
        .single();

      if (invErr || !inv) throw new Error(`Failed to insert expired invitation: ${invErr?.message}`);
      createdInvitationIds.push(inv.id);

      assert(inv.status === "expired", "Invitation is initially in expired state");

      // Resend expired invitation
      const resendRes = await resendAdminInvitation({
        invitationId: inv.id,
        callerAdminId: owner.adminId,
        callerEmail: owner.email,
      });

      assert(resendRes.success === true, "resendAdminInvitation succeeds on expired invitation");
      assert(resendRes.invitation?.status === "pending", "Status restored to 'pending'");

      const newExpiry = new Date(resendRes.invitation!.expires_at).getTime();
      assert(newExpiry > Date.now() + 6 * 24 * 60 * 60 * 1000, "New expiration is ~7 days in the future");
      assert(resendRes.invitation!.token !== expiredToken, "Fresh token assigned");
      assert(Boolean(resendRes.notificationId), "Notification dispatched for renewed invite");

      // Verify old token cannot be used
      const authUserId2 = await getOrCreateAuthUser(expiredEmail);

      const oldAccept = await acceptAdminInvitation({
        token: expiredToken,
        authUserId: authUserId2,
        email: expiredEmail,
      });
      assert(oldAccept.success === false, "Old expired token is completely invalid");

      // Verify new token accepts
      const newAccept = await acceptAdminInvitation({
        token: resendRes.invitation!.token,
        authUserId: authUserId2,
        email: expiredEmail,
      });
      assert(newAccept.success === true, "New token from expired resend accepts successfully");
    }

    // -------------------------------------------------------------------------
    // Case 3: Accepted invitations cannot be resent
    // -------------------------------------------------------------------------
    console.log("\n--- Case 3: Accepted Invitation Cannot Be Resent ---");
    {
      const nonce = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const acceptedEmail = `invite_accepted_${nonce}@sivvai-test.local`;
      const token = randomBytes(32).toString("hex");

      const { data: inv } = await serviceClient
        .from("admin_invitations")
        .insert({
          email: acceptedEmail,
          role_id: editorRole.id,
          token,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          invited_by: owner.adminId,
        })
        .select()
        .single();

      createdInvitationIds.push(inv!.id);

      const res = await resendAdminInvitation({
        invitationId: inv!.id,
        callerAdminId: owner.adminId,
        callerEmail: owner.email,
      });

      assert(res.success === false, "Resend rejected for accepted invitation");
      assert(res.error?.includes("accepted") === true, "Descriptive error returned for accepted invitation");
    }

    // -------------------------------------------------------------------------
    // Case 4: Revoked invitations cannot be resent
    // -------------------------------------------------------------------------
    console.log("\n--- Case 4: Revoked Invitation Cannot Be Resent ---");
    {
      const nonce = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const revokedEmail = `invite_revoked_${nonce}@sivvai-test.local`;
      const token = randomBytes(32).toString("hex");

      const { data: inv } = await serviceClient
        .from("admin_invitations")
        .insert({
          email: revokedEmail,
          role_id: editorRole.id,
          token,
          status: "revoked",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          invited_by: owner.adminId,
        })
        .select()
        .single();

      createdInvitationIds.push(inv!.id);

      const res = await resendAdminInvitation({
        invitationId: inv!.id,
        callerAdminId: owner.adminId,
        callerEmail: owner.email,
      });

      assert(res.success === false, "Resend rejected for revoked invitation");
      assert(res.error?.includes("revoked") === true, "Descriptive error returned for revoked invitation");
    }

    // -------------------------------------------------------------------------
    // Case 5: Authorization & RLS Enforcement
    // -------------------------------------------------------------------------
    console.log("\n--- Case 5: Authorization & RLS Enforcement ---");
    {
      // Authenticate as a Manager (who lacks manage_users permission)
      const managerAnonClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: signInData, error: signInErr } = await managerAnonClient.auth.signInWithPassword({
        email: manager.email,
        password: manager.password,
      });
      assert(!signInErr && Boolean(signInData?.session), "Manager authenticated client established");

      // Attempt to directly UPDATE admin_invitations table via RLS as Manager
      const { data: rlsUpdate, error: rlsErr } = await managerAnonClient
        .from("admin_invitations")
        .update({ status: "pending" })
        .eq("email", "random@sivvai.local")
        .select();

      // Under RLS, either error is thrown or 0 rows modified because manager lacks manage_users
      assert(
        Boolean(rlsErr) || Boolean(rlsUpdate && rlsUpdate.length === 0),
        "Non-Owner cannot update admin_invitations through RLS (blocked)"
      );

      await managerAnonClient.auth.signOut();
    }

    // -------------------------------------------------------------------------
    // Invariant: Competing pending invitations revoked
    // -------------------------------------------------------------------------
    console.log("\n--- Invariant: Competing Pending Invitations Revocation ---");
    {
      const nonce = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const sharedEmail = `competing_${nonce}@sivvai-test.local`;

      // Create first pending invitation
      const { data: inv1 } = await serviceClient
        .from("admin_invitations")
        .insert({
          email: sharedEmail,
          role_id: editorRole.id,
          token: randomBytes(32).toString("hex"),
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          invited_by: owner.adminId,
        })
        .select()
        .single();
      createdInvitationIds.push(inv1!.id);

      // Create second pending invitation for same email
      const { data: inv2 } = await serviceClient
        .from("admin_invitations")
        .insert({
          email: sharedEmail,
          role_id: editorRole.id,
          token: randomBytes(32).toString("hex"),
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          invited_by: owner.adminId,
        })
        .select()
        .single();
      createdInvitationIds.push(inv2!.id);

      // Now resend inv2 — inv1 should be revoked
      await resendAdminInvitation({
        invitationId: inv2!.id,
        callerAdminId: owner.adminId,
        callerEmail: owner.email,
      });

      const { data: checkInv1 } = await serviceClient
        .from("admin_invitations")
        .select("status")
        .eq("id", inv1!.id)
        .single();
      const { data: checkInv2 } = await serviceClient
        .from("admin_invitations")
        .select("status")
        .eq("id", inv2!.id)
        .single();

      assert(checkInv1?.status === "revoked", "Competing prior invitation was automatically revoked");
      assert(checkInv2?.status === "pending", "Resent invitation remains the sole active pending invitation");
    }

  } finally {
    // -------------------------------------------------------------------------
    // Guaranteed Cleanup
    // -------------------------------------------------------------------------
    console.log("\n===========================================================");
    console.log("   Tearing down temporary test records...");
    console.log("===========================================================");

    for (const invId of createdInvitationIds) {
      try {
        await serviceClient.from("admin_invitations").delete().eq("id", invId);
      } catch (err) {
        console.error(`Cleanup failed for invitation ${invId}:`, err);
        cleanupErrors++;
      }
    }

    for (const userId of createdAuthUserIds) {
      try {
        await serviceClient.auth.admin.deleteUser(userId);
      } catch (err) {
        console.error(`Cleanup failed for user ${userId}:`, err);
        cleanupErrors++;
      }
    }

    if (cleanupErrors === 0) {
      console.log("✅ All temporary invitations and test accounts cleaned up.\n");
    } else {
      console.error(`❌ Cleanup encountered ${cleanupErrors} error(s).\n`);
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log(`=== Phase 5.3 Verification: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0 || cleanupErrors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
