/**
 * lib/utils/money.ts
 *
 * Canonical money conversion utilities between major currency units (e.g. Naira)
 * and minor currency units (e.g. Kobo / Cents).
 *
 * All operations are pure, stateless, and guard against IEEE 754 floating-point
 * precision errors via standard rounding before integer conversion.
 */

/**
 * Converts an amount in major currency units (e.g. 52800.99 Naira) to minor units (5280099 Kobo).
 */
export function nairaToKobo(naira: number): number {
  if (!Number.isFinite(naira)) return 0;
  return Math.round(naira * 100);
}

/**
 * Converts an amount in minor currency units (e.g. 5280099 Kobo) to major units (52800.99 Naira).
 */
export function koboToNaira(kobo: number): number {
  if (!Number.isFinite(kobo)) return 0;
  return Number((kobo / 100).toFixed(2));
}
