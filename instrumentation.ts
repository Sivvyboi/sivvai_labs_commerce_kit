/**
 * instrumentation.ts
 *
 * Next.js server instrumentation — runs once when the server starts.
 * Used for initializing observability tools (OpenTelemetry, Sentry, Datadog).
 *
 * The `register` function is called by Next.js automatically on server startup
 * in both Node.js and Edge runtimes. Use `NEXT_RUNTIME` to branch per runtime.
 *
 * This file is a skeleton for Step 1. Actual APM integration happens in a
 * later step once the monitoring stack is chosen.
 *
 * Reference:
 * → node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md
 *   (section: "instrumentation.ts")
 */

export async function register(): Promise<void> {
  // TODO (DevOps/Observability): Integrate your APM tool here.
  //
  // Example — Sentry (Node.js runtime only):
  // if (process.env.NEXT_RUNTIME === "nodejs") {
  //   const { init } = await import("@sentry/nextjs");
  //   init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
  // }
  //
  // Example — OpenTelemetry:
  // if (process.env.NEXT_RUNTIME === "nodejs") {
  //   const { registerOTel } = await import("@vercel/otel");
  //   registerOTel({ serviceName: "sivvai-commerce-kit" });
  // }

  if (process.env.NODE_ENV === "development") {
    // Confirm the instrumentation hook is being called during dev.
    // Remove this log before going to production.
    console.log("[instrumentation] register() called — NEXT_RUNTIME:", process.env.NEXT_RUNTIME);
  }
}
