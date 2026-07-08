/**
 * lib/supabase/middleware.ts
 *
 * Supabase client for use in middleware.ts ONLY.
 *
 * Next.js middleware runs in the Edge Runtime — it cannot use Node.js APIs
 * like `fs` or `crypto`, and it does NOT have access to the cookies store
 * from next/headers. Instead, cookies are read/written via the middleware
 * Request and Response objects.
 *
 * This is a third, distinct client from the server and browser clients
 * because of these unique constraints.
 *
 * Usage (middleware.ts):
 *   import { createMiddlewareClient } from "@/lib/supabase/middleware";
 *   import { NextRequest, NextResponse } from "next/server";
 *
 *   export async function middleware(request: NextRequest) {
 *     const { supabase, response } = createMiddlewareClient(request);
 *     const { data: { session } } = await supabase.auth.getSession();
 *     return response;
 *   }
 *
 * TODO: Install @supabase/ssr and uncomment the real implementation below.
 *       npm install @supabase/ssr @supabase/supabase-js
 */

import type { NextRequest, NextResponse } from "next/server";

/**
 * Creates a Supabase client suitable for Next.js middleware.
 * Returns both the client and a pre-built NextResponse so that cookies
 * set by Supabase are correctly forwarded to the browser.
 */
export function createMiddlewareClient(
  // Intentionally unused until @supabase/ssr implementation is added.
  // The underscore prefix satisfies the no-unused-vars lint rule.
  _request: NextRequest
): {
  supabase: never;
  response: NextResponse;
} {
  // TODO: Implement with @supabase/ssr
  //
  // import { createServerClient } from "@supabase/ssr";
  // import type { Database } from "@/types";
  // import { NextResponse } from "next/server";
  //
  // let response = NextResponse.next({ request });
  //
  // const supabase = createServerClient<Database>(
  //   process.env.SUPABASE_URL!,
  //   process.env.SUPABASE_ANON_KEY!,
  //   {
  //     cookies: {
  //       getAll() { return request.cookies.getAll(); },
  //       setAll(cookiesToSet) {
  //         cookiesToSet.forEach(({ name, value }) =>
  //           request.cookies.set(name, value)
  //         );
  //         response = NextResponse.next({ request });
  //         cookiesToSet.forEach(({ name, value, options }) =>
  //           response.cookies.set(name, value, options)
  //         );
  //       },
  //     },
  //   }
  // );
  //
  // return { supabase, response };

  throw new Error(
    "createMiddlewareClient is not yet implemented. " +
      "Install @supabase/ssr and uncomment the implementation in lib/supabase/middleware.ts"
  );
}
