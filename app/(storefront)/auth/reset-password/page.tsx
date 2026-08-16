import * as React from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/storefront/auth/ResetPasswordForm";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Set New Password",
  description: "Set a new password for your customer account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 sm:p-8 shadow-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-black text-[var(--kit-text-primary)]">
          Set New Password
        </h1>
        <p className="text-xs text-[var(--kit-muted-fg)]">
          Choose a secure password for your customer account.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--kit-accent)]" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
