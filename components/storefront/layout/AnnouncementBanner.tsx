/**
 * components/storefront/layout/AnnouncementBanner.tsx
 *
 * Server Component. Top announcement banner for promotions and sitewide announcements.
 * Fully config-driven via `announcementBanner` in `config/storefront.ts`.
 */

import Link from "next/link";
import { announcementBanner } from "@/config/storefront";

export function AnnouncementBanner() {
  if (!announcementBanner.enabled || !announcementBanner.message) {
    return null;
  }

  return (
    <aside
      aria-label="Announcement"
      className="w-full bg-[var(--kit-primary)] py-2 px-4 text-center text-xs font-medium text-[var(--kit-primary-fg)] transition-colors"
    >
      <div className="mx-auto flex max-w-screen-xl items-center justify-center gap-2">
        <span>{announcementBanner.message}</span>
        {announcementBanner.link && (
          <Link
            href={announcementBanner.link}
            className="underline underline-offset-4 hover:opacity-80 transition-opacity font-semibold shrink-0"
          >
            {announcementBanner.linkLabel ?? "Shop Now"} →
          </Link>
        )}
      </div>
    </aside>
  );
}
