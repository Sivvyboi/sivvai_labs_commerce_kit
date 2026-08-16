import * as React from "react";
import type { Metadata } from "next";
import { SignUpForm } from "@/components/storefront/auth/SignUpForm";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a customer account to track orders and save shipping addresses.",
};

export default function SignUpPage() {
  return (
    <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 sm:p-8 shadow-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-black text-[var(--kit-text-primary)]">
          Create Account
        </h1>
        <p className="text-xs text-[var(--kit-muted-fg)]">
          Join to easily manage your purchases and speed up checkout.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--kit-accent)]" />
          </div>
        }
      >
        <SignUpForm />
      </Suspense>
    </div>
  );
}
