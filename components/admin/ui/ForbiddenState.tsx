/**
 * components/admin/ui/ForbiddenState.tsx
 *
 * Rendered when an admin user attempts to access a page/feature for which they lack permission (HTTP 403 equivalent).
 */

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export function ForbiddenState({
  title = "Access Restricted",
  message = "You don't have permission to access this page or feature. Please contact your store owner to request elevated access.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--kit-danger)]/10 text-[var(--kit-danger)] border border-[var(--kit-danger)]/20">
        <ShieldAlert size={28} />
      </div>

      <h1 className="text-xl font-bold text-[var(--kit-fg)]">{title}</h1>
      <p className="mt-2 max-w-md text-xs text-[var(--kit-muted-fg)] leading-relaxed">
        {message}
      </p>

      <div className="mt-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--kit-primary)] px-4 py-2 text-xs font-medium text-[var(--kit-primary-fg)] transition-colors hover:bg-[var(--kit-primary)]/90"
        >
          <ArrowLeft size={14} />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
