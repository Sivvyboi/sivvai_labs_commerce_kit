/**
 * config/localization.ts
 *
 * Controls locale, currency formatting, timezone, and reading direction.
 * Keep all i18n-adjacent settings here so they are changed in one place.
 *
 * When you integrate next-intl or similar, this file becomes the source of
 * truth for supported locales and the default locale.
 */

export const localizationConfig = {
  /**
   * BCP 47 language tag for the default locale.
   * Drives `<html lang="...">`, Intl formatters, and future i18n routing.
   */
  defaultLocale: "en",

  /**
   * All locales the storefront will support.
   * Add entries here before adding message files under messages/.
   */
  supportedLocales: ["en"] as const,

  /**
   * ISO 4217 currency code.
   * Used by lib/utils/format.ts to format all monetary values.
   */
  currency: "USD" as const,

  /**
   * IANA timezone name.
   * Used for displaying order timestamps and scheduling.
   */
  timezone: "UTC",

  /**
   * Whether the default locale is right-to-left.
   * When true, the root layout should set <html dir="rtl">.
   */
  isRTL: false,
} as const;

export type LocalizationConfig = typeof localizationConfig;
export type SupportedLocale =
  (typeof localizationConfig.supportedLocales)[number];
