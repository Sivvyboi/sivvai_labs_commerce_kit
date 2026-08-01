/**
 * app/admin/(auth)/reset-password/page.tsx
 *
 * Reset Password Page — Server Component.
 */

import React from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set New Password",
};

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-[var(--kit-fg)]">
          Set new password
        </h2>
        <p className="text-xs text-[var(--kit-muted-fg)]">
          Please enter your new password below
        </p>
      </div>

      <ResetPasswordForm />
    </div>
  );
}
