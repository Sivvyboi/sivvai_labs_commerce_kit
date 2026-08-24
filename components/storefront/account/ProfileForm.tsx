"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerRow } from "@/lib/db/customers";
import { useAccount } from "@/features/storefront/hooks/useAccount";
import { User, Phone, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileFormProps {
  customer: CustomerRow;
}

export function ProfileForm({ customer }: ProfileFormProps) {
  const router = useRouter();
  const { updateProfile, isLoading } = useAccount();
  const [firstName, setFirstName] = useState(customer.first_name || "");
  const [lastName, setLastName] = useState(customer.last_name || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const res = await updateProfile({
      firstName,
      lastName,
      phone,
    });

    if (res.success) {
      setSuccessMessage("Profile updated successfully!");
      router.refresh();
    } else {
      setErrorMessage(res.error || "Failed to update profile");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {successMessage && (
        <div className="flex items-center gap-3 p-4 text-sm font-medium text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 text-sm font-medium text-rose-800 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800/50">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label
            htmlFor="firstName"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]"
          >
            First Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)]" />
            <input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] transition-all min-h-[44px]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="lastName"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]"
          >
            Last Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)]" />
            <input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] transition-all min-h-[44px]"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]"
        >
          Email Address (Primary)
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)]" />
          <input
            id="email"
            type="email"
            disabled
            value={customer.email}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-muted-fg)] cursor-not-allowed min-h-[44px]"
          />
        </div>
        <p className="text-xs text-[var(--kit-muted-fg)]">
          Email address cannot be changed directly for security reasons.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="phone"
          className="block text-xs font-semibold uppercase tracking-wider text-[var(--kit-muted-fg)]"
        >
          Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)]" />
          <input
            id="phone"
            type="tel"
            placeholder="+234 800 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] transition-all min-h-[44px]"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--kit-accent)] px-6 py-3 text-sm font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 transition-opacity min-h-[44px] shadow-sm disabled:opacity-50"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Save Changes</span>
        </button>
      </div>
    </form>
  );
}
