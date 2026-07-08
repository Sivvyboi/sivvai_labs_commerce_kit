/**
 * middleware.ts
 *
 * Next.js middleware — runs on every matching request BEFORE the page renders.
 * Executes in the Edge Runtime (no Node.js APIs like `fs`, `crypto`, etc.).
 *
 * Current responsibilities (Step 1 — skeleton only):
 * - Stub for future auth session refresh via Supabase
 * - Stub for future locale detection and redirect
 *
 * Future responsibilities (Step 2+):
 * - Refresh Supabase auth session cookies on every request
 * - Redirect unauthenticated users away from protected routes
 * - Detect Accept-Language header and redirect to locale-prefixed paths
 * - Inject A/B test flags into request headers
 *
 * IMPORTANT: The matcher below is intentional. It excludes:
 * - Static files (_next/static, _next/image)
 * - Public folder assets (favicon.ico, images, fonts)
 * - The health-check endpoint (so monitoring isn't blocked by auth logic)
 *
 * Reference:
 * → node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md
 */

import { type NextRequest, NextResponse } from "next/server";

export function middleware(_request: NextRequest): NextResponse {
  // TODO (Step 4 — Auth): Uncomment and implement Supabase session refresh.
  //
  // import { createMiddlewareClient } from "@/lib/supabase/middleware";
  //
  // const { supabase, response } = createMiddlewareClient(request);
  // await supabase.auth.getSession(); // refreshes session cookie
  //
  // const { data: { session } } = await supabase.auth.getSession();
  // const isProtected = request.nextUrl.pathname.startsWith("/account") ||
  //                     request.nextUrl.pathname.startsWith("/admin");
  //
  // if (isProtected && !session) {
  //   return NextResponse.redirect(new URL(ROUTES.auth.signIn, request.url));
  // }
  //
  // return response;

  // TODO (Step 5 — i18n): Detect locale from Accept-Language and redirect.

  // Pass through with no modifications until the above TODOs are implemented.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (Next.js build assets)
     * - _next/image   (image optimisation API)
     * - favicon.ico   (browser favicon request)
     * - public folder files (images, fonts, robots.txt, etc.)
     * - /api/health   (monitoring — must never be blocked)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|webm)$).*)",
  ],
};
