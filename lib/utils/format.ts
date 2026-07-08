/**
 * lib/utils/format.ts
 *
 * Pure formatting utilities for currency, dates, numbers, and strings.
 * All functions are stateless and side-effect free — safe to use in
 * both Server and Client Components.
 *
 * Formatting is locale-aware via the Intl API. The default locale and
 * currency come from config/localization.ts.
 */

import { localizationConfig } from "@/config/localization";

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

/**
 * Formats a numeric amount as a locale-aware currency string.
 *
 * @param amount    - The amount in major currency units (e.g. 29.99 for $29.99)
 * @param currency  - ISO 4217 currency code. Defaults to configured currency.
 * @param locale    - BCP 47 locale string. Defaults to configured locale.
 *
 * @example
 *   formatCurrency(29.99)           // "$29.99"  (en, USD)
 *   formatCurrency(5000, "NGN", "en") // "₦5,000.00"
 */
export function formatCurrency(
  amount: number,
  currency: string = localizationConfig.currency,
  locale: string = localizationConfig.defaultLocale
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a price stored in minor units (cents/kobo) to a currency string.
 * Useful when your database stores prices as integers to avoid float errors.
 *
 * @param minorAmount - Amount in minor currency units (e.g. 2999 for $29.99)
 * @param currency    - ISO 4217 currency code.
 */
export function formatMinorCurrency(
  minorAmount: number,
  currency: string = localizationConfig.currency,
  locale: string = localizationConfig.defaultLocale
): string {
  return formatCurrency(minorAmount / 100, currency, locale);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * Formats a date as a short human-readable string.
 *
 * @example
 *   formatDate(new Date())  // "Jul 8, 2026"
 */
export function formatDate(
  date: Date | string,
  locale: string = localizationConfig.defaultLocale
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/**
 * Formats a date with full time information.
 *
 * @example
 *   formatDateTime(new Date())  // "Jul 8, 2026, 2:30 PM"
 */
export function formatDateTime(
  date: Date | string,
  locale: string = localizationConfig.defaultLocale
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/**
 * Returns a relative time string (e.g. "3 hours ago", "in 2 days").
 * Useful for order timestamps and review dates.
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string = localizationConfig.defaultLocale
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  return rtf.format(diffDay, "day");
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/**
 * Formats a plain number with locale-aware grouping separators.
 *
 * @example
 *   formatNumber(1000000)  // "1,000,000"
 */
export function formatNumber(
  value: number,
  locale: string = localizationConfig.defaultLocale
): string {
  return new Intl.NumberFormat(locale).format(value);
}

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

/**
 * Converts a string to a URL-friendly slug.
 *
 * @example
 *   slugify("Hello World!")  // "hello-world"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Truncates a string to a maximum length, appending an ellipsis.
 *
 * @example
 *   truncate("Long product description...", 30)  // "Long product description..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}
