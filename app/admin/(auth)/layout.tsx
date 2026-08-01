/**
 * app/admin/(auth)/layout.tsx
 *
 * Auth Layout for Admin Auth Pages (Login, Forgot Password, Reset Password).
 * Provides a clean centered background layout without the admin sidebar/shell.
 */

import * as React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s · Admin Auth",
    default: "Admin Authentication",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--kit-bg)] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--kit-primary)] text-xl font-bold text-[var(--kit-primary-fg)] shadow-[var(--kit-shadow-sm)]">
            S
          </div>
          <h1 className="text-xl font-bold text-[var(--kit-fg)]">
            Merchant Admin
          </h1>
          <p className="text-xs text-[var(--kit-muted-fg)]">
            Sivvai Commerce Kit
          </p>
        </div>

        {/* Card content */}
        <div className="rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 shadow-[var(--kit-shadow-md)]">
          {children}
        </div>
      </div>
    </div>
  );
}
