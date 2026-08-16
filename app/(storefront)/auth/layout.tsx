/**
 * app/(storefront)/auth/layout.tsx
 *
 * Customer Authentication Root Layout.
 * Provides a clean, focused, card-centered container for customer sign-in, registration,
 * and password recovery pages.
 */

import * as React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s · Customer Account",
    default: "Customer Authentication",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function CustomerAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
