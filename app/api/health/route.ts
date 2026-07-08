/**
 * app/api/health/route.ts
 *
 * Health-check endpoint — GET /api/health
 *
 * Used by:
 * - Infrastructure monitoring (uptime checkers, load balancers)
 * - CI/CD pipelines to verify deployment success
 * - Development: quick sanity check that the server is responding
 *
 * Returns HTTP 200 with a JSON body on success.
 * Returns HTTP 503 with details if a critical dependency is unavailable.
 *
 * This is a Route Handler (Next.js App Router API).
 * Reference:
 * → node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md
 */

import { siteConfig } from "@/config/site";

/**
 * Force dynamic rendering so the response reflects real-time state.
 * Without this, Next.js may statically cache the response.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const payload = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: siteConfig.name,
    version: process.env.npm_package_version ?? "0.1.0",
    environment: process.env.NODE_ENV,
  };

  return Response.json(payload, {
    status: 200,
    headers: {
      // Do not cache health responses
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
