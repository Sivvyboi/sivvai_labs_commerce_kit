"use server";

/**
 * features/admin/actions/audit.actions.ts
 *
 * Typed Server Actions for viewing immutable administrative audit logs.
 * Requires the 'view_activity' permission.
 */

import { requirePermission } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditLogRow {
  id: string;
  admin_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor?: {
    email: string;
    roleName: string;
    roleKey: string;
  } | null;
}

export interface ListAuditLogsParams {
  limit?: number;
  offset?: number;
  action?: string;
  adminUserId?: string;
}

export interface ListAuditLogsResponse {
  success: boolean;
  logs?: AuditLogRow[];
  count?: number;
  error?: string;
}

export async function listAuditLogsAction(
  params: ListAuditLogsParams = {}
): Promise<ListAuditLogsResponse> {
  try {
    await requirePermission("view_activity");

    const limit = Math.min(Math.max(Number(params.limit ?? 25), 1), 100);
    const offset = Math.max(Number(params.offset ?? 0), 0);
    const adminSupabase = createAdminClient();

    let query = adminSupabase
      .from("audit_logs")
      .select(
        "id, admin_user_id, action, entity_type, entity_id, metadata, ip_address, user_agent, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.action && params.action !== "all") {
      query = query.eq("action", params.action);
    }

    if (params.adminUserId && params.adminUserId !== "all") {
      query = query.eq("admin_user_id", params.adminUserId);
    }

    const { data: rawLogs, count, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Collect distinct admin_user_ids to enrich actor info
    const adminUserIds = Array.from(
      new Set(
        (rawLogs || [])
          .map((l) => l.admin_user_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const actorMap = new Map<string, { email: string; roleName: string; roleKey: string }>();

    if (adminUserIds.length > 0) {
      const { data: adminUsers } = await adminSupabase
        .from("admin_users")
        .select(`
          id,
          auth_user_id,
          roles (
            name,
            key
          )
        `)
        .in("id", adminUserIds);

      const { data: authUsersData } = await adminSupabase.auth.admin.listUsers();
      const authUserMap = new Map(authUsersData?.users.map((u) => [u.id, u.email]) || []);

      if (adminUsers) {
        for (const au of adminUsers as any[]) {
          const email = (authUserMap.get(au.auth_user_id) as string) || "Unknown Admin";
          const roleName = (au.roles?.name as string) || "No Role";
          const roleKey = (au.roles?.key as string) || "unknown";
          actorMap.set(au.id, { email, roleName, roleKey });
        }
      }
    }

    const logs: AuditLogRow[] = (rawLogs || []).map((l) => ({
      id: l.id,
      admin_user_id: l.admin_user_id,
      action: l.action,
      entity_type: l.entity_type,
      entity_id: l.entity_id,
      metadata: l.metadata as Record<string, unknown> | null,
      ip_address: l.ip_address,
      user_agent: l.user_agent,
      created_at: l.created_at,
      actor: l.admin_user_id ? actorMap.get(l.admin_user_id) || null : null,
    }));

    return {
      success: true,
      logs,
      count: count ?? logs.length,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load audit logs",
    };
  }
}
