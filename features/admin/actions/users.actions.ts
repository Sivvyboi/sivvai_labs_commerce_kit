"use server";

/**
 * features/admin/actions/users.actions.ts
 *
 * Typed Server Actions for Admin User Management (Owner only: manage_users).
 * Implements strict lockout protection rules & re-authentication requirements.
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/services/authz-service";

interface AdminUserJoinedRow {
  id: string;
  auth_user_id: string;
  role_id: string | null;
  is_active: boolean;
  is_protected_owner: boolean;
  created_at: string;
  updated_at: string;
  roles: {
    id: string;
    key: string;
    name: string;
    description: string | null;
  } | null;
}

/**
 * Verifies current admin's password before performing high-risk Owner operations.
 */
async function verifyAdminPassword(email: string, password: string): Promise<boolean> {
  if (!password) return false;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

/**
 * Helper to count remaining active Owner accounts in the system.
 */
async function countActiveOwners(): Promise<number> {
  const adminSupabase = createAdminClient();

  const { data: ownerRole } = await adminSupabase
    .from("roles")
    .select("id")
    .eq("key", "owner")
    .single();

  if (!ownerRole) return 0;

  const { count } = await adminSupabase
    .from("admin_users")
    .select("id", { count: "exact", head: true })
    .eq("role_id", ownerRole.id)
    .eq("is_active", true);

  return count ?? 0;
}

export async function listAdminUsersAction() {
  try {
    const callerCtx = await requirePermission("manage_users");
    const adminSupabase = createAdminClient();

    const { data: rawAdminUsers, error } = await adminSupabase
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
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const adminUsers = (rawAdminUsers || []) as unknown as AdminUserJoinedRow[];

    // Fetch email and metadata from auth.users via service role
    const { data: authUsersData } = await adminSupabase.auth.admin.listUsers();
    const authUsersMap = new Map(authUsersData?.users.map((u) => [u.id, u]) || []);

    const enrichedUsers = adminUsers.map((u) => {
      const authUser = authUsersMap.get(u.auth_user_id);
      return {
        id: u.id,
        auth_user_id: u.auth_user_id,
        role_id: u.role_id,
        is_active: u.is_active,
        is_protected_owner: u.is_protected_owner,
        created_at: u.created_at,
        updated_at: u.updated_at,
        email: authUser?.email || "Unknown Email",
        last_sign_in_at: authUser?.last_sign_in_at || null,
        role: u.roles,
      };
    });

    return {
      success: true,
      users: enrichedUsers,
      currentAuthUserId: callerCtx.user.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to list admin users",
    };
  }
}

export async function getRolesAction() {
  try {
    await requirePermission("manage_users");
    const adminSupabase = createAdminClient();

    const { data: roles, error } = await adminSupabase
      .from("roles")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    return { success: true, roles };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch roles",
    };
  }
}

export async function updateAdminRoleAction(params: {
  adminId: string;
  roleId: string;
  password?: string;
  reason?: string;
}) {
  try {
    const callerCtx = await requirePermission("manage_users");
    const adminSupabase = createAdminClient();

    // 1. Fetch target admin record joined with role
    const { data: targetRaw, error: fetchErr } = await adminSupabase
      .from("admin_users")
      .select(`
        id,
        auth_user_id,
        role_id,
        is_active,
        is_protected_owner,
        roles (
          key,
          name
        )
      `)
      .eq("id", params.adminId)
      .single();

    if (fetchErr || !targetRaw) throw new Error("Target administrator record not found");

    const targetAdmin = targetRaw as unknown as {
      id: string;
      auth_user_id: string;
      role_id: string | null;
      is_active: boolean;
      is_protected_owner: boolean;
      roles: { key: string; name: string } | null;
    };

    // 2. Safeguard: Prevent changing own role
    if (targetAdmin.auth_user_id === callerCtx.user.id) {
      throw new Error("Your own Owner role cannot be changed. Ask another Owner to change your role.");
    }

    // 3. Safeguard: Protected Owner account protection
    if (targetAdmin.is_protected_owner) {
      throw new Error("Protected Owner account privileges cannot be altered.");
    }

    // 4. Fetch target new role info
    const { data: newRole } = await adminSupabase
      .from("roles")
      .select("key, name")
      .eq("id", params.roleId)
      .single();

    if (!newRole) throw new Error("Selected role does not exist.");

    const isDemotingOwner = targetAdmin.roles?.key === "owner" && newRole.key !== "owner";
    const isPromotingToOwner = targetAdmin.roles?.key !== "owner" && newRole.key === "owner";

    // 5. Safeguard: Re-authentication password required for sensitive Owner role changes
    if (isDemotingOwner || isPromotingToOwner) {
      if (!params.password) {
        throw new Error("Password verification is required for sensitive Owner role changes.");
      }
      const isValidPassword = await verifyAdminPassword(callerCtx.user.email!, params.password);
      if (!isValidPassword) {
        throw new Error("Incorrect password. Re-authentication failed.");
      }
    }

    // 6. Safeguard: Minimum 1 active Owner check when demoting
    if (isDemotingOwner) {
      const activeOwnersCount = await countActiveOwners();
      if (activeOwnersCount <= 1) {
        throw new Error("Cannot demote the last active Owner account. There must always be at least one active Owner.");
      }
    }

    // 7. Apply role update
    const { data: updated, error: updateErr } = await adminSupabase
      .from("admin_users")
      .update({ role_id: params.roleId, updated_at: new Date().toISOString() })
      .eq("id", params.adminId)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // 8. Log detailed audit event
    await logAuditEvent({
      action: "admin_user.role_update",
      entityType: "admin_user",
      entityId: params.adminId,
      metadata: {
        old_role: targetAdmin.roles?.name || "None",
        new_role: newRole.name,
        reason: params.reason || "Role update by Owner",
        actor_email: callerCtx.user.email,
        target_auth_user_id: targetAdmin.auth_user_id,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${params.adminId}`);
    return { success: true, user: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update admin role",
    };
  }
}

export async function deactivateAdminUserAction(params: {
  adminId: string;
  password?: string;
  reason?: string;
}) {
  try {
    const callerCtx = await requirePermission("manage_users");
    const adminSupabase = createAdminClient();

    // 1. Fetch target admin record joined with role
    const { data: targetRaw, error: fetchErr } = await adminSupabase
      .from("admin_users")
      .select(`
        id,
        auth_user_id,
        role_id,
        is_active,
        is_protected_owner,
        roles (
          key,
          name
        )
      `)
      .eq("id", params.adminId)
      .single();

    if (fetchErr || !targetRaw) throw new Error("Target administrator record not found");

    const targetAdmin = targetRaw as unknown as {
      id: string;
      auth_user_id: string;
      role_id: string | null;
      is_active: boolean;
      is_protected_owner: boolean;
      roles: { key: string; name: string } | null;
    };

    // 2. Safeguard: Prevent deactivating self
    if (targetAdmin.auth_user_id === callerCtx.user.id) {
      throw new Error("You cannot deactivate your own administrator account.");
    }

    // 3. Safeguard: Protected Owner account protection
    if (targetAdmin.is_protected_owner) {
      throw new Error("Protected Owner account cannot be deactivated.");
    }

    const isDeactivatingOwner = targetAdmin.roles?.key === "owner";

    // 4. Safeguard: Re-authentication password required when deactivating an Owner
    if (isDeactivatingOwner) {
      if (!params.password) {
        throw new Error("Password verification is required when deactivating an Owner account.");
      }
      const isValidPassword = await verifyAdminPassword(callerCtx.user.email!, params.password);
      if (!isValidPassword) {
        throw new Error("Incorrect password. Re-authentication failed.");
      }
    }

    // 5. Safeguard: Minimum 1 active Owner check
    if (isDeactivatingOwner) {
      const activeOwnersCount = await countActiveOwners();
      if (activeOwnersCount <= 1) {
        throw new Error("Cannot deactivate the last active Owner account. There must always be at least one active Owner.");
      }
    }

    // 6. Set is_active = false
    const { data: updated, error: updateErr } = await adminSupabase
      .from("admin_users")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", params.adminId)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // 7. Immediately revoke all refresh tokens (strong session invalidation)
    try {
      await adminSupabase.auth.admin.signOut(targetAdmin.auth_user_id);
    } catch (signOutErr) {
      console.warn("Could not sign out user session immediately:", signOutErr);
    }

    // 8. Log audit log
    await logAuditEvent({
      action: "admin_user.deactivate",
      entityType: "admin_user",
      entityId: params.adminId,
      metadata: {
        role: targetAdmin.roles?.name || "None",
        reason: params.reason || "Deactivated by Owner",
        actor_email: callerCtx.user.email,
        target_auth_user_id: targetAdmin.auth_user_id,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${params.adminId}`);
    return { success: true, user: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to deactivate admin user",
    };
  }
}

export async function reactivateAdminUserAction(adminId: string) {
  try {
    const callerCtx = await requirePermission("manage_users");
    const adminSupabase = createAdminClient();

    const { data: updated, error } = await adminSupabase
      .from("admin_users")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", adminId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await logAuditEvent({
      action: "admin_user.reactivate",
      entityType: "admin_user",
      entityId: adminId,
      metadata: {
        actor_email: callerCtx.user.email,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${adminId}`);
    return { success: true, user: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reactivate admin user",
    };
  }
}
