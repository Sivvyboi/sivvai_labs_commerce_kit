import "server-only";

/**
 * lib/auth/permissions.ts
 *
 * Semantic helper functions for checking admin permissions.
 * Wraps services/authz-service.ts.
 */

import { checkPermission, getCurrentAdminContext } from "@/services/authz-service";

export async function getAdminPermissions(): Promise<string[]> {
  const ctx = await getCurrentAdminContext();
  return ctx?.permissions || [];
}

export async function canManageProducts(): Promise<boolean> {
  return checkPermission("manage_products");
}

export async function canManageCategories(): Promise<boolean> {
  return checkPermission("manage_categories");
}

export async function canManageInventory(): Promise<boolean> {
  return checkPermission("manage_inventory");
}

export async function canManageOrders(): Promise<boolean> {
  return checkPermission("manage_orders");
}

export async function canViewOrders(): Promise<boolean> {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return false;
  return ctx.permissions.includes("view_orders") || ctx.permissions.includes("manage_orders");
}

export async function canManageCustomers(): Promise<boolean> {
  return checkPermission("manage_customers");
}

export async function canViewCustomers(): Promise<boolean> {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return false;
  return ctx.permissions.includes("view_customers") || ctx.permissions.includes("manage_customers");
}

export async function canManagePromotions(): Promise<boolean> {
  return checkPermission("manage_promotions");
}

export async function canManageSettings(): Promise<boolean> {
  return checkPermission("manage_settings");
}

export async function canViewActivity(): Promise<boolean> {
  return checkPermission("view_activity");
}

export async function canManageUsers(): Promise<boolean> {
  return checkPermission("manage_users");
}
