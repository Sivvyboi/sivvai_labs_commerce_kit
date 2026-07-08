/**
 * app/not-found.tsx
 *
 * Global 404 page.
 *
 * Rendered when:
 * - `notFound()` is called inside any route segment.
 * - The URL does not match any route.
 *
 * This is a Server Component. If you need client interactivity (e.g. a
 * search input), extract it into a Client Component and import it here.
 *
 * Reference:
 * → node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md
 */

import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-6xl font-bold tracking-tighter text-[var(--kit-muted-fg)] opacity-40">
          404
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="max-w-sm text-sm text-[var(--kit-muted-fg)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>

      <Link
        href={ROUTES.home}
        className="rounded-[var(--kit-radius-md)] bg-[var(--kit-primary)] px-5 py-2.5 text-sm font-medium text-[var(--kit-primary-fg)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)]"
      >
        Back to home
      </Link>
    </main>
  );
}
