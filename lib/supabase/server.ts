/**
 * lib/supabase/server.ts
 *
 * Supabase client for use in Server Components, Server Functions (actions),
 * and Route Handlers ONLY.
 *
 * This file imports `server-only` which causes a BUILD-TIME ERROR if you
 * accidentally import this into a Client Component. This is intentional —
 * the server client has access to the service role key which must never
 * reach the browser.
 *
 * Usage (Server Component):
 *   import { createServerClient } from "@/lib/supabase/server";
 *   const supabase = await createServerClient();
 *   const { data } = await supabase.from("products").select("*");
 *
 * TODO: Install @supabase/ssr and uncomment the real implementation below.
 *       npm install @supabase/ssr @supabase/supabase-js
 */

import "server-only";

// ---------------------------------------------------------------------------
// Placeholder — replace with real implementation once @supabase/ssr is installed
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase client configured for the server environment.
 * Reads cookies via next/headers for session management.
 *
 * This is an async function because `cookies()` from next/headers is async
 * in Next.js 16 (breaking change from Next.js 14).
 */
export async function createServerClient() {
  // TODO: Implement with @supabase/ssr
  //
  // import { createServerClient as _createServerClient } from "@supabase/ssr";
  // import { cookies } from "next/headers";
  // import type { Database } from "@/types";
  //
  // const cookieStore = await cookies();
  //
  // return _createServerClient<Database>(
  //   process.env.SUPABASE_URL!,
  //   process.env.SUPABASE_ANON_KEY!,
  //   {
  //     cookies: {
  //       getAll() { return cookieStore.getAll(); },
  //       setAll(cookiesToSet) {
  //         try {
  //           cookiesToSet.forEach(({ name, value, options }) =>
  //             cookieStore.set(name, value, options)
  //           );
  //         } catch {
  //           // The `setAll` method was called from a Server Component.
  //           // Ignore — middleware refreshes sessions instead.
  //         }
  //       },
  //     },
  //   }
  // );

  throw new Error(
    "createServerClient is not yet implemented. " +
      "Install @supabase/ssr and uncomment the implementation in lib/supabase/server.ts"
  );
}
