/**
 * lib/supabase/admin.ts
 *
 * Supabase Service-Role Admin client.
 *
 * ⚠ SECURITY NOTICE:
 * This client uses SUPABASE_SERVICE_ROLE_KEY which BYPASSES ALL ROW LEVEL SECURITY (RLS).
 *
 * Security rules:
 * 1. Must NEVER be imported into Client Components (`import "server-only";` enforces this at build time).
 * 2. Must NEVER expose the service role key to the browser.
 * 3. Use ONLY inside server-side repository layers (`lib/db/*`) for privileged mutations:
 *    - Inventory locks & stock movement logging
 *    - Order creation & status updates
 *    - Payment attempt & event logging
 *    - Customer creation during guest checkout
 *    - Notification logs & promo coupon counter increments
 * 4. Do NOT use for user-scoped data reads.
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types";

/**
 * Creates a Supabase client with admin (service-role) privileges.
 * Bypasses RLS. Server-only.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
