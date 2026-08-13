import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

export const CART_COOKIE_NAME = "cart_token";

/**
 * Generates a new cryptographically random opaque cart token.
 * This is the value stored in the browser cookie — never the DB cart ID.
 */
export function generateCartToken(): string {
  return crypto.randomUUID();
}

/**
 * Computes a SHA-256 hex hash of the raw cart token.
 * This hash is stored in `carts.cart_token_hash` and passed via `x-cart-token-hash` header.
 */
export function hashCartToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Retrieves the guest cart_token string from request cookies.
 */
export async function getCartToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(CART_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Retrieves and hashes the guest cart_token.
 */
export async function getCartTokenHash(): Promise<string | null> {
  const token = await getCartToken();
  if (!token) return null;
  return hashCartToken(token);
}
