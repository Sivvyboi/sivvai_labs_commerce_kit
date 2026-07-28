"use client";

/**
 * components/storefront/checkout/ContactForm.tsx
 *
 * Client Component. Customer contact details form (Email, Full Name, Phone).
 */

import type { ContactInfo } from "@/features/storefront/hooks/useCheckout";
import { Mail, User, Phone } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ContactFormProps {
  contact: ContactInfo;
  onChange: (info: Partial<ContactInfo>) => void;
  errors?: Record<string, string>;
  className?: string;
}

export function ContactForm({
  contact,
  onChange,
  errors = {},
  className,
}: ContactFormProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="text-base font-bold text-[var(--kit-text-primary)]">
        Contact Information
      </h2>

      {/* Full Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="fullName"
          className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider"
        >
          Full Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="fullName"
            type="text"
            value={contact.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            placeholder="John Doe"
            required
            className={cn(
              "w-full rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] pl-10 pr-4 py-3 text-sm text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[44px]",
              errors.fullName && "border-red-500 focus:ring-red-500"
            )}
          />
        </div>
        {errors.fullName && (
          <p className="text-xs text-red-500 font-medium">{errors.fullName}</p>
        )}
      </div>

      {/* Email Address */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider"
        >
          Email Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="email"
            type="email"
            value={contact.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="john@example.com"
            required
            className={cn(
              "w-full rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] pl-10 pr-4 py-3 text-sm text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[44px]",
              errors.email && "border-red-500 focus:ring-red-500"
            )}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-500 font-medium">{errors.email}</p>
        )}
      </div>

      {/* Phone Number */}
      <div className="space-y-1.5">
        <label
          htmlFor="phone"
          className="block text-xs font-semibold text-[var(--kit-text-primary)] uppercase tracking-wider"
        >
          Phone Number <span className="text-[var(--kit-muted-fg)] font-normal">(Optional)</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kit-muted-fg)] pointer-events-none" />
          <input
            id="phone"
            type="tel"
            value={contact.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+234 801 234 5678"
            className="w-full rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] pl-10 pr-4 py-3 text-sm text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[44px]"
          />
        </div>
      </div>
    </div>
  );
}
