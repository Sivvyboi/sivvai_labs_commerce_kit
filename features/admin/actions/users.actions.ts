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

    // 7b. Set notification flag so user sees storefront popup about new role
    const { data: authUserObj } = await adminSupabase.auth.admin.getUserById(targetAdmin.auth_user_id);
    if (authUserObj?.user) {
      await adminSupabase.auth.admin.updateUserById(targetAdmin.auth_user_id, {
        user_metadata: {
          ...(authUserObj.user.user_metadata || {}),
          sivvai_admin_notification: {
            role: newRole.name,
            promoted_at: new Date().toISOString(),
          },
        },
      });
    }

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
        target_admin_id: adminId,
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

// ---------------------------------------------------------------------------
// Permission Override Types
// ---------------------------------------------------------------------------

export type PermissionOverrideMode = "inherit" | "grant" | "deny";

export interface AdminUserPermissionRow {
  id: string;
  key: string;
  description: string | null;
  /** Whether the target admin's base role grants this permission */
  from_role: boolean;
  /** Explicit per-user override state */
  override: PermissionOverrideMode;
  /** Computed effective permission (role ∪ grants − denies, with manage_users invariant) */
  effective: boolean;
  /**
   * True for manage_users — Owner-only system permission that cannot be
   * manipulated via user-level overrides regardless of caller intent.
   */
  is_locked: boolean;
}

// ---------------------------------------------------------------------------
// getAdminUserPermissionsAction
// ---------------------------------------------------------------------------

/**
 * Retrieves the full permission state for a target admin user.
 * Returns role baseline, explicit override, and effective access for every permission.
 * Requires manage_users. Protected Owners are represented as fully-effective read-only.
 */
export async function getAdminUserPermissionsAction(adminId: string) {
  try {
    await requirePermission("manage_users");

    if (!adminId || typeof adminId !== "string") {
      throw new Error("Invalid adminId");
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch target admin with their role
    const { data: targetRaw, error: targetErr } = await adminSupabase
      .from("admin_users")
      .select(`
        id,
        role_id,
        is_protected_owner,
        roles (
          id,
          key,
          name
        )
      `)
      .eq("id", adminId)
      .single();

    if (targetErr || !targetRaw) {
      throw new Error("Administrator record not found");
    }

    const target = targetRaw as unknown as {
      id: string;
      role_id: string | null;
      is_protected_owner: boolean;
      roles: { id: string; key: string; name: string } | null;
    };

    // 2. Fetch all permissions, role_permissions for target role, and override rows in parallel
    const [allPermsRes, rolePermsRes, overridesRes] = await Promise.all([
      adminSupabase.from("permissions").select("id, key, description").order("key"),
      target.role_id
        ? adminSupabase
            .from("role_permissions")
            .select("permission_id")
            .eq("role_id", target.role_id)
        : Promise.resolve({ data: [] as { permission_id: string }[], error: null }),
      adminSupabase
        .from("admin_user_permissions")
        .select("permission_id, is_granted")
        .eq("admin_user_id", adminId),
    ]);

    if (allPermsRes.error) throw new Error("Failed to load permissions");
    if (rolePermsRes.error) throw new Error("Failed to load role permissions");
    if (overridesRes.error) throw new Error("Failed to load user permission overrides");

    const allPerms = (allPermsRes.data ?? []) as {
      id: string;
      key: string;
      description: string | null;
    }[];

    const rolePermIds = new Set(
      ((rolePermsRes.data ?? []) as { permission_id: string }[]).map((r) => r.permission_id)
    );

    const overrideMap = new Map<string, boolean>(
      ((overridesRes.data ?? []) as { permission_id: string; is_granted: boolean }[]).map((o) => [
        o.permission_id,
        o.is_granted,
      ])
    );

    // 3. Build the structured permission rows
    const rows: AdminUserPermissionRow[] = allPerms.map((perm) => {
      const isLocked = perm.key === "manage_users";
      const fromRole = rolePermIds.has(perm.id);

      let override: PermissionOverrideMode = "inherit";
      if (overrideMap.has(perm.id)) {
        override = overrideMap.get(perm.id) ? "grant" : "deny";
      }

      let effective: boolean;
      if (target.is_protected_owner) {
        // Protected owners have all permissions regardless of anything
        effective = true;
      } else if (isLocked) {
        // manage_users is always false for non-protected owners
        effective = false;
      } else if (override === "grant") {
        effective = true;
      } else if (override === "deny") {
        effective = false;
      } else {
        // INHERIT: falls back to role
        effective = fromRole;
      }

      return {
        id: perm.id,
        key: perm.key,
        description: perm.description,
        from_role: fromRole,
        override,
        effective,
        is_locked: isLocked,
      };
    });

    return {
      success: true as const,
      permissions: rows,
      isProtectedOwner: target.is_protected_owner,
      roleName: target.roles?.name ?? null,
    };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to load user permissions",
    };
  }
}

// ---------------------------------------------------------------------------
// setAdminUserPermissionOverrideAction
// ---------------------------------------------------------------------------

/**
 * Sets, updates, or removes a per-user permission override for a target admin.
 * Enforces all RBAC invariants server-side:
 *  - Requires manage_users (caller must be a protected Owner)
 *  - Protected Owner targets: all overrides rejected
 *  - manage_users permission: rejected for any non-protected target
 *  - Writes detailed audit log on every successful mutation
 */
export async function setAdminUserPermissionOverrideAction(params: {
  adminId: string;
  permissionId: string;
  mode: PermissionOverrideMode;
}) {
  try {
    const callerCtx = await requirePermission("manage_users");

    // 1. Validate inputs
    if (!params.adminId || typeof params.adminId !== "string") {
      throw new Error("Invalid adminId");
    }
    if (!params.permissionId || typeof params.permissionId !== "string") {
      throw new Error("Invalid permissionId");
    }
    const validModes: PermissionOverrideMode[] = ["inherit", "grant", "deny"];
    if (!validModes.includes(params.mode)) {
      throw new Error(`Invalid mode '${params.mode}'. Must be one of: inherit, grant, deny`);
    }

    const adminSupabase = createAdminClient();

    // 2. Fetch target admin
    const { data: targetRaw, error: targetErr } = await adminSupabase
      .from("admin_users")
      .select("id, auth_user_id, is_protected_owner, roles(key, name)")
      .eq("id", params.adminId)
      .single();

    if (targetErr || !targetRaw) {
      throw new Error("Target administrator record not found");
    }

    const target = targetRaw as unknown as {
      id: string;
      auth_user_id: string;
      is_protected_owner: boolean;
      roles: { key: string; name: string } | null;
    };

    // 3. Invariant: Protected Owners cannot have per-user overrides set
    if (target.is_protected_owner) {
      throw new Error(
        "Protected Owner accounts cannot have per-user permission overrides. Protected Owners retain full system access."
      );
    }

    // 4. Fetch the permission record to verify it exists and get its key
    const { data: permRecord, error: permErr } = await adminSupabase
      .from("permissions")
      .select("id, key, description")
      .eq("id", params.permissionId)
      .single();

    if (permErr || !permRecord) {
      throw new Error("Permission not found");
    }

    const perm = permRecord as { id: string; key: string; description: string | null };

    // 5. Invariant: manage_users is Owner-only system permission — cannot be overridden
    if (perm.key === "manage_users") {
      throw new Error(
        "'manage_users' is a system-level Owner-only permission and cannot be manipulated through per-user overrides."
      );
    }

    // 6. Read current override state (for audit log)
    const { data: currentOverride } = await adminSupabase
      .from("admin_user_permissions")
      .select("is_granted")
      .eq("admin_user_id", params.adminId)
      .eq("permission_id", params.permissionId)
      .maybeSingle();

    const previousMode: PermissionOverrideMode =
      currentOverride == null
        ? "inherit"
        : currentOverride.is_granted
        ? "grant"
        : "deny";

    // 7. Apply DB mutation
    if (params.mode === "inherit") {
      // INHERIT: remove override row entirely
      const { error: deleteErr } = await adminSupabase
        .from("admin_user_permissions")
        .delete()
        .eq("admin_user_id", params.adminId)
        .eq("permission_id", params.permissionId);

      if (deleteErr) throw new Error(`Failed to remove override: ${deleteErr.message}`);
    } else {
      // GRANT or DENY: upsert override row
      const { error: upsertErr } = await adminSupabase
        .from("admin_user_permissions")
        .upsert(
          {
            admin_user_id: params.adminId,
            permission_id: params.permissionId,
            is_granted: params.mode === "grant",
          },
          { onConflict: "admin_user_id,permission_id" }
        );

      if (upsertErr) throw new Error(`Failed to set override: ${upsertErr.message}`);
    }

    // 8. Audit log
    await logAuditEvent({
      action: "admin_user.permission_override",
      entityType: "admin_user",
      entityId: params.adminId,
      metadata: {
        actor_email: callerCtx.user.email,
        target_auth_user_id: target.auth_user_id,
        target_role: target.roles?.name ?? "None",
        permission_key: perm.key,
        permission_description: perm.description,
        previous_mode: previousMode,
        new_mode: params.mode,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${params.adminId}`);
    revalidatePath("/admin/team/members");

    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to update permission override",
    };
  }
}
