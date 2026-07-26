/**
 * components/storefront/home/NewsletterSection.tsx
 *
 * Client Component. Email newsletter sign-up section.
 * Only rendered when `featureFlag.newsletter === true`.
 *
 * Submit handler is a Server Action stub — logs the email server-side.
 * Connect to an email marketing provider (Mailchimp, ConvertKit, etc.) later.
 */

"use client";

import { useRef, useEffect, useActionState } from "react";
import { subscribeToNewsletterAction } from "@/features/storefront/actions/newsletter.actions";
import { Mail, CheckCircle, Loader2 } from "lucide-react";

type FormState = {
  success: boolean;
  error: string | null;
};

const INITIAL_STATE: FormState = { success: false, error: null };

export function NewsletterSection() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    subscribeToNewsletterAction,
    INITIAL_STATE
  );

  // Reset form on success — must run in an effect, not during render
  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  return (
    <section className="bg-[var(--kit-surface)] border-t border-[var(--kit-border)] py-12 sm:py-16">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center space-y-5">
          {/* Icon */}
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] mx-auto">
            <Mail className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--kit-text-primary)]">
              Stay in the loop
            </h2>
            <p className="text-xs sm:text-sm text-[var(--kit-muted-fg)] mt-2 max-w-md mx-auto">
              New drops, exclusive deals, and style inspo. Straight to your inbox. No spam — ever.
            </p>
          </div>

          {/* Success State */}
          {state.success ? (
            <div className="inline-flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-5 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>You&apos;re subscribed! We&apos;ll be in touch soon.</span>
            </div>
          ) : (
            <form
              ref={formRef}
              action={formAction}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mx-auto max-w-md"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Enter your email address"
                className="flex-1 rounded-xl border border-[var(--kit-border)] bg-[var(--kit-card)] px-4 py-3 text-sm text-[var(--kit-text-primary)] placeholder:text-[var(--kit-muted-fg)] outline-none focus:ring-2 focus:ring-[var(--kit-accent)] focus:border-transparent min-h-[44px]"
              />

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--kit-accent)] px-5 py-3 text-sm font-semibold text-[var(--kit-accent-fg)] hover:opacity-90 disabled:opacity-60 transition-opacity min-h-[44px] shrink-0"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Subscribing…</span>
                  </>
                ) : (
                  <span>Subscribe</span>
                )}
              </button>
            </form>
          )}

          {/* Error */}
          {state.error && (
            <p className="text-xs text-red-500 text-center">{state.error}</p>
          )}

          <p className="text-xs text-[var(--kit-muted-fg)]">
            By subscribing you agree to receive marketing emails. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
