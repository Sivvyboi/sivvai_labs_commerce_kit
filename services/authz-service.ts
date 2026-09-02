import "server-only";

/**
 * services/authz-service.ts
 *
 * Central Authorization Service.
 * Provides request-scoped caching (via React cache) for admin context,
 * permission checks, and audit logging.
 */

import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server-auth";
import type { User } from "@supabase/supabase-js";
import type { Json } from "@/types/database.types";

export interface AdminRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
}

export interface AdminContext {
  user: User;
  admin: {
    id: string;
    auth_user_id: string;
    role_id: string | null;
    is_active: boolean;
    is_protected_owner: boolean;
    created_at: string;
    updated_at: string;
  };
  role: AdminRole | null;
  permissions: string[];
}

/**
 * Fetches and caches the full admin authorization context for the current request.
 * Returns null if the user is not authenticated or not an active admin.
 */
export const getCurrentAdminContext = cache(async (): Promise<AdminContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  // Fetch admin_users record with joined role
  const { data: rawAdminRecord, error: adminError } = await supabase
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
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[getCurrentAdminContext] Error fetching admin_users:", adminError.message);
    return null;
  }

  if (!rawAdminRecord) {
    console.warn(`[getCurrentAdminContext] User ${user.id} (${user.email}) is authenticated but not in admin_users table. Run: npx tsx scripts/bootstrap-admin.ts ${user.email}`);
    return null;
  }

  // Cast raw output to bypass empty Relationship inference in hand-crafted types
  const adminRecord = rawAdminRecord as unknown as {
    id: string;
    auth_user_id: string;
    role_id: string | null;
    is_active: boolean;
    is_protected_owner: boolean;
    created_at: string;
    updated_at: string;
    roles: AdminRole | null;
  };

  if (!adminRecord.is_active) {
    return null;
  }

  let permissions: string[] = [];

  // Protected owners always retain ALL effective permissions with complete immunity
  if (adminRecord.is_protected_owner) {
    const { data: allPermRecords, error: permsError } = await supabase
      .from("permissions")
      .select("key");

    if (permsError) {
      console.error("[getCurrentAdminContext] Error fetching all permissions for protected owner:", permsError.message);
      return null; // Fail closed
    }

    permissions = (allPermRecords ?? [])
      .map((p) => p.key)
      .filter((k): k is string => Boolean(k));
  } else {
    // Fetch base role permissions & per-user overrides in parallel
    const [rolePermsRes, overridesRes] = await Promise.all([
      adminRecord.role_id
        ? supabase
            .from("role_permissions")
            .select(`
              permissions (
                key
              )
            `)
            .eq("role_id", adminRecord.role_id)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("admin_user_permissions")
        .select(`
          is_granted,
          permissions (
            key
          )
        `)
        .eq("admin_user_id", adminRecord.id),
    ]);

    if (rolePermsRes.error) {
      console.error("[getCurrentAdminContext] Error fetching role_permissions:", rolePermsRes.error.message);
      return null; // Fail closed
    }
    if (overridesRes.error) {
      console.error("[getCurrentAdminContext] Error fetching admin_user_permissions:", overridesRes.error.message);
      return null; // Fail closed
    }

    // 1. Base role permissions (INHERIT base)
    const roleKeys = ((rolePermsRes.data ?? []) as unknown as Array<{ permissions: { key: string } | null }>)
      .map((p) => p.permissions?.key)
      .filter((k): k is string => Boolean(k));

    const effectiveSet = new Set<string>(roleKeys);

    // 2. Apply per-user overrides (GRANT = true adds, DENY = false removes)
    const overrides = (overridesRes.data ?? []) as unknown as Array<{
      is_granted: boolean;
      permissions: { key: string } | null;
    }>;

    for (const ov of overrides) {
      const key = ov.permissions?.key;
      if (!key) continue;
      if (ov.is_granted) {
        effectiveSet.add(key);
      } else {
        effectiveSet.delete(key);
      }
    }

    // INVARIANT: manage_users is strictly Owner-only.
    // Non-protected staff members MUST NEVER obtain effective manage_users,
    // even via role assignment or explicit per-user GRANT override.
    if (!adminRecord.is_protected_owner) {
      effectiveSet.delete("manage_users");
    }

    permissions = Array.from(effectiveSet);
  }

  return {
    user,
    admin: {
      id: adminRecord.id,
      auth_user_id: adminRecord.auth_user_id,
      role_id: adminRecord.role_id,
      is_active: adminRecord.is_active,
      is_protected_owner: adminRecord.is_protected_owner ?? false,
      created_at: adminRecord.created_at,
      updated_at: adminRecord.updated_at,
    },
    role: adminRecord.roles,
    permissions,
  };
});

/**
 * Checks if the current authenticated admin user has a specific permission.
 * Respects effective permissions and permission hierarchy (manage_* implies view_*).
 */
export async function checkPermission(permission: string): Promise<boolean> {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return false;
  return (
    ctx.permissions.includes(permission) ||
    (permission === "view_orders" && ctx.permissions.includes("manage_orders")) ||
    (permission === "view_customers" && ctx.permissions.includes("manage_customers"))
  );
}

/**
 * Logs an administrative event to the audit_logs table.
 */
export async function logAuditEvent(params: {
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const ctx = await getCurrentAdminContext();
    if (!ctx?.admin.id) {
      console.warn(`[logAuditEvent] Skipping audit log '${params.action}': No active admin context.`);
      return;
    }

    const supabase = await createClient();

    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    try {
      const headerList = await headers();
      ipAddress = headerList.get("x-forwarded-for")?.split(",")[0] || headerList.get("x-real-ip") || null;
      userAgent = headerList.get("user-agent") || null;
    } catch {
      // Ignored if headers() context unavailable
    }

    await supabase.from("audit_logs").insert({
      admin_user_id: ctx.admin.id,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      metadata: (params.metadata as unknown as Json) || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
