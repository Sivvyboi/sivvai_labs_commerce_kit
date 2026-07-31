import "server-only";

/**
 * lib/auth/admin-guard.ts
 *
 * Admin access guard — server-side only.
 *
 * Current behaviour (featureFlag.auth === false):
 *   No-op passthrough. All admin routes are accessible in development.
 *
 * When featureFlag.auth is enabled, replace the body of requireAdmin() with:
 *   const user = await requireUser();
 *   // Check user role / metadata here
 *   if (!isAdmin(user)) redirect('/');
 *
 * This abstraction ensures every admin page uses requireAdmin() consistently,
 * so auth enforcement is a one-line change rather than a cross-cutting refactor.
 */

export async function requireAdmin(): Promise<void> {
  // TODO(auth): uncomment when featureFlag.auth is enabled
  // const { requireUser } = await import("./server-auth");
  // const user = await requireUser();
  // if (!user.app_metadata?.role === "admin") {
  //   const { redirect } = await import("next/navigation");
  //   redirect("/");
  // }
}
