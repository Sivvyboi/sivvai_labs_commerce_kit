/**
 * lib/supabase/proxy.ts
 *
 * Supabase client and session updater for Next.js proxy.ts ONLY.
 *
 * Next.js proxy/middleware runs before requests reach server components.
 * It refreshes expired Auth tokens using cookies and passes updated cookies
 * back in the response headers.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // IMPORTANT: getClaims() or getUser() refreshes the auth token if needed
  // Supabase SSR guidelines recommend getClaims() or getUser() for token refresh in proxy/middleware
  const { data: claimsData } = await supabase.auth.getClaims();

  return { supabase, response, user: claimsData?.claims };
}
