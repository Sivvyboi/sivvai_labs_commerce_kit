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

import { createClient as _createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient as _createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types";

import { CART_COOKIE_NAME, hashCartToken } from "../auth/cart-token";

/**
 * Creates a public, stateless Supabase client for reading public catalog & store data
 * (products, categories, store settings, shipping methods).
 * Does NOT invoke cookies() or headers(), so it is 100% safe for static generation,
 * generateStaticParams, generateMetadata, and ISR routes without DYNAMIC_SERVER_USAGE errors.
 */
export function createPublicClient() {
  return _createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/**
 * Creates a Supabase client configured for the server environment.
 * Reads cookies via next/headers for session management.
 * Passes x-cart-token-hash in request headers to enable guest cart RLS evaluation.
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const rawCartToken = cookieStore.get(CART_COOKIE_NAME)?.value;
  const cartTokenHash = rawCartToken ? hashCartToken(rawCartToken) : "";

  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          ...(cartTokenHash ? { "x-cart-token-hash": cartTokenHash } : {}),
        },
      },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // Ignore — middleware refreshes sessions instead.
          }
        },
      },
    }
  );
}

export const createClient = createServerClient;


