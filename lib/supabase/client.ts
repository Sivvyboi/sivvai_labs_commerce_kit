/**
 * lib/supabase/client.ts
 *
 * Supabase client for use in Client Components ONLY.
 *
 * This file imports `client-only` which causes a BUILD-TIME ERROR if you
 * accidentally import this into a Server Component.
 *
 * The browser client uses the ANON key (safe to expose) and manages
 * auth sessions via cookies in the browser.
 *
 * Usage (Client Component):
 *   "use client";
 *   import { createBrowserClient } from "@/lib/supabase/client";
 *   const supabase = createBrowserClient();
 *
 * NOTE: Call createBrowserClient() inside a component or hook, not at the
 * module level. This avoids SSR issues and ensures the client is only created
 * when rendered in the browser.
 *
 * TODO: Install @supabase/ssr and uncomment the real implementation below.
 *       npm install @supabase/ssr @supabase/supabase-js
 */

import "client-only";

/**
 * Creates a Supabase client for browser/client-side usage.
 * This is a synchronous function — no cookies() or headers() needed.
 */
export function createBrowserClient() {
  // TODO: Implement with @supabase/ssr
  //
  // import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
  // import type { Database } from "@/types";
  //
  // return _createBrowserClient<Database>(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  // );

  throw new Error(
    "createBrowserClient is not yet implemented. " +
      "Install @supabase/ssr and uncomment the implementation in lib/supabase/client.ts"
  );
}
