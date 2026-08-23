import type { EmailProvider } from "./email-provider";
import { ResendEmailProvider } from "./providers/resend-provider";
import { MockEmailProvider } from "./providers/mock-provider";

let defaultProviderInstance: EmailProvider | null = null;

/**
 * Returns the configured transactional email provider.
 * Follows the project factory pattern (similar to payment-factory).
 */
export function getEmailProvider(overrideProviderName?: string): EmailProvider {
  const providerName = (
    overrideProviderName ||
    process.env.EMAIL_PROVIDER ||
    "resend"
  ).toLowerCase();

  if (providerName === "mock") {
    return new MockEmailProvider();
  }

  if (providerName === "resend") {
    // If no API key is provided in development or test, fall back safely to MockEmailProvider
    if (
      !process.env.RESEND_API_KEY &&
      (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
    ) {
      return new MockEmailProvider();
    }
    return new ResendEmailProvider();
  }

  // Default fallback to Resend
  return new ResendEmailProvider();
}

/**
 * Convenience helper for default shared provider instance.
 */
export function getDefaultEmailProvider(): EmailProvider {
  if (!defaultProviderInstance) {
    defaultProviderInstance = getEmailProvider();
  }
  return defaultProviderInstance;
}
