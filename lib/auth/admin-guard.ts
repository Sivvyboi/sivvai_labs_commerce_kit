import "server-only";
import { requireUser } from "./server-auth";
import type { User } from "@supabase/supabase-js";

/**
 * lib/auth/admin-guard.ts
 *
 * Admin access guard — server-side only.
 * Calls requireUser() to enforce authentication via Supabase Auth.
 * If user is not authenticated, requireUser() redirects to /admin/login.
 */

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  return user;
}
