/**
 * app/admin/(auth)/forgot-password/page.tsx
 *
 * Forgot Password Page — Server Component.
 */

import React from "react";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-[var(--kit-fg)]">
          Reset password
        </h2>
        <p className="text-xs text-[var(--kit-muted-fg)]">
          Enter your email to receive a password reset link
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
