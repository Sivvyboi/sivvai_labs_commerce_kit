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

import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Creates a Supabase client suitable for Next.js middleware.
 * Returns both the client and a pre-built NextResponse so that cookies
 * set by Supabase are correctly forwarded to the browser.
 */
export function createMiddlewareClient(
  request: NextRequest
): {
  supabase: ReturnType<typeof createServerClient<Database>>;
  response: NextResponse;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase environment variables are missing. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local"
    );
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, response };
}

