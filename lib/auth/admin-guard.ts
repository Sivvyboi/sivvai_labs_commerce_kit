import "server-only";

/**
 * lib/auth/admin-guard.ts
 *
 * Admin access guards — server-side only.
 * Enforces authentication and role-based permissions using getCurrentAdminContext().
 */

import { redirect } from "next/navigation";
import { getCurrentAdminContext, type AdminContext } from "@/services/authz-service";
import type { User } from "@supabase/supabase-js";

/**
 * Ensures the requesting user is an authenticated and active admin.
 * Redirects to /admin/login if unauthenticated or deactivated.
 */
export async function requireAdmin(): Promise<User> {
  const ctx = await getCurrentAdminContext();
  if (!ctx) {
    redirect("/admin/login");
  }
  return ctx.user;
}

/**
 * Ensures the requesting user is an authenticated and active admin AND possesses the target permission.
 * Redirects to /admin/login if unauthenticated/deactivated, or /admin/forbidden if unauthorized.
 */
export async function requirePermission(permission: string): Promise<AdminContext> {
  const ctx = await getCurrentAdminContext();
  if (!ctx) {
    redirect("/admin/login");
  }

  const hasPerm =
    ctx.permissions.includes(permission) ||
    (permission === "view_orders" && ctx.permissions.includes("manage_orders")) ||
    (permission === "view_customers" && ctx.permissions.includes("manage_customers"));

  if (!hasPerm) {
    redirect("/admin/forbidden");
  }

  return ctx;
}
