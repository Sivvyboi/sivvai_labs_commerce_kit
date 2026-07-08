/**
 * lib/utils/assert.ts
 *
 * Runtime assertion helpers for TypeScript type narrowing.
 *
 * These utilities replace scattered `if (!x) throw` patterns with named,
 * self-documenting assertions. They also provide TypeScript with the
 * narrowed types via the `asserts` keyword.
 *
 * Usage:
 *   import { assert, assertDefined, assertNever } from "@/lib/utils/assert";
 *
 *   assertDefined(user, "User must be logged in");
 *   // After this line, TypeScript knows `user` is non-nullable.
 */

/**
 * General-purpose assertion. Throws if `condition` is falsy.
 *
 * @param condition - The value or expression to assert is truthy.
 * @param message   - Error message shown when assertion fails.
 */
export function assert(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Asserts that `value` is not `null` or `undefined`.
 * After calling this, TypeScript narrows `value` to `NonNullable<T>`.
 *
 * @example
 *   const product = await getProduct(id);
 *   assertDefined(product, `Product not found: ${id}`);
 *   // product is now narrowed to the non-null type
 */
export function assertDefined<T>(
  value: T,
  message: string
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Exhaustiveness check for discriminated unions.
 * Place at the end of a switch statement's `default` branch to get a
 * compile-time error when a new variant is added to the union.
 *
 * @example
 *   switch (order.status) {
 *     case "pending":   return handlePending();
 *     case "shipped":   return handleShipped();
 *     case "delivered": return handleDelivered();
 *     default: assertNever(order.status);
 *   }
 */
export function assertNever(value: never): never {
  throw new Error(
    `assertNever: received an unexpected value: ${JSON.stringify(value)}`
  );
}

/**
 * Type guard: checks if a value is a non-null object.
 * Useful for narrowing `unknown` API responses before accessing properties.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
