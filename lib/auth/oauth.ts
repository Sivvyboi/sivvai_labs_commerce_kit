/**
 * lib/auth/oauth.ts
 *
 * Helper functions for Google OAuth normalization and metadata extraction.
 */

export interface OAuthUserData {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  phone?: string | null;
}

/**
 * Extracts first name and last name from provider user metadata (e.g. Google).
 * Supports given_name/family_name, full_name, name, and first_name/last_name fields.
 */
export function parseOAuthNames(metadata?: Record<string, unknown>): {
  firstName: string | null;
  lastName: string | null;
} {
  if (!metadata) return { firstName: null, lastName: null };

  let firstName: string | null = null;
  let lastName: string | null = null;

  // 1. Direct given_name / family_name (standard in Google OpenID profiles)
  if (typeof metadata.given_name === "string" && metadata.given_name.trim()) {
    firstName = metadata.given_name.trim();
  }
  if (typeof metadata.family_name === "string" && metadata.family_name.trim()) {
    lastName = metadata.family_name.trim();
  }

  // 2. Direct first_name / last_name if present
  if (!firstName && typeof metadata.first_name === "string" && metadata.first_name.trim()) {
    firstName = metadata.first_name.trim();
  }
  if (!lastName && typeof metadata.last_name === "string" && metadata.last_name.trim()) {
    lastName = metadata.last_name.trim();
  }

  // 3. Fall back to parsing full_name or name string
  const rawFullName =
    (typeof metadata.full_name === "string" ? metadata.full_name : null) ||
    (typeof metadata.name === "string" ? metadata.name : null);

  if ((!firstName || !lastName) && rawFullName && rawFullName.trim()) {
    const parts = rawFullName.trim().split(/\s+/);
    if (!firstName && parts.length > 0) {
      firstName = parts[0];
    }
    if (!lastName && parts.length > 1) {
      lastName = parts.slice(1).join(" ");
    }
  }

  return {
    firstName: firstName || null,
    lastName: lastName || null,
  };
}
