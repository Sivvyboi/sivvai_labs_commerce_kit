import * as React from "react";
import type { Metadata } from "next";
import { SignInForm } from "@/components/storefront/auth/SignInForm";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your customer account to view your orders, addresses, and saved items.",
};

export default function SignInPage() {
  return (
    <div className="rounded-2xl border border-[var(--kit-border)] bg-[var(--kit-card)] p-6 sm:p-8 shadow-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-black text-[var(--kit-text-primary)]">
          Welcome Back
        </h1>
        <p className="text-xs text-[var(--kit-muted-fg)]">
          Sign in to manage your orders, saved addresses, and profile.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--kit-accent)]" />
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </div>
  );
}
