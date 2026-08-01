/**
 * proxy.ts
 *
 * Next.js request proxy — runs on every matching request BEFORE the page renders.
 * Note: Starting with Next.js 16, Middleware is deprecated and renamed to Proxy.
 *
 * Responsibilities:
 * - Refresh Supabase auth session cookies on every request via updateSession()
 * - Protect /admin and /admin/* routes from unauthenticated access
 * - Redirect authenticated users away from /admin/login to /admin
 *
 * Matcher excludes static assets and public files.
 */

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isAdminAuthRoute =
    pathname === "/admin/login" ||
    pathname === "/admin/forgot-password" ||
    pathname === "/admin/reset-password";

  const isAdminRoute = pathname.startsWith("/admin");

  // Protection: redirect unauthenticated users away from protected admin routes
  if (isAdminRoute && !isAdminAuthRoute && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from admin auth routes (e.g. login)
  if (isAdminAuthRoute && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
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
