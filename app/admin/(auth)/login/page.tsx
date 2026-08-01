/**
 * app/admin/(auth)/login/page.tsx
 *
 * Admin Login Page — Server Component.
 * Suspense boundary wraps LoginForm to support searchParams reading.
 */

import React, { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
};

export default function AdminLoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-[var(--kit-fg)]">
          Welcome back
        </h2>
        <p className="text-xs text-[var(--kit-muted-fg)]">
          Enter your credentials to access the admin console
        </p>
      </div>

      <Suspense fallback={<div className="text-xs text-[var(--kit-muted-fg)]">Loading login form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
