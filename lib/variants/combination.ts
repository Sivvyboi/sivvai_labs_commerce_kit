/**
 * lib/variants/combination.ts
 *
 * Core domain algorithms for variant combinations:
 * - Deterministic normalization and comparison
 * - Cartesian product combination generation
 * - SKU generation
 * - Display label formatting
 */

export interface OptionGroupInput {
  name: string;
  values: Array<{ label: string }>;
}

export type OptionCombination = Record<string, string>;

/**
 * Normalizes an option combination object:
 * - Trims all group names (keys) and value labels (values).
 * - Sorts keys in alphabetical order so serialization is identical.
 */
export function normalizeOptionCombination(combo?: OptionCombination | null): OptionCombination {
  if (!combo || typeof combo !== "object" || Array.isArray(combo)) {
    return {};
  }

  const normalized: OptionCombination = {};
  const entries = Object.entries(combo)
    .map(
      ([k, v]) =>
        [k.trim(), typeof v === "string" ? v.trim() : String(v ?? "").trim()] as [string, string]
    )
    .filter(([k, v]) => Boolean(k) && Boolean(v))
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [key, val] of entries) {
    normalized[key] = val;
  }

  return normalized;
}

/**
 * Performs deep semantic equality comparison between two option combinations.
 */
export function compareOptionCombinations(
  a?: OptionCombination | null,
  b?: OptionCombination | null
): boolean {
  const normA = normalizeOptionCombination(a);
  const normB = normalizeOptionCombination(b);

  const keysA = Object.keys(normA);
  const keysB = Object.keys(normB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (normA[key] !== normB[key]) return false;
  }

  return true;
}

/**
 * Generates Cartesian product of all option groups:
 * e.g., Size [S, M] x Color [Red, Blue] -> 4 combinations:
 * [
 *   { Size: 'S', Color: 'Red' },
 *   { Size: 'S', Color: 'Blue' },
 *   { Size: 'M', Color: 'Red' },
 *   { Size: 'M', Color: 'Blue' }
 * ]
 *
 * If product has 0 groups (or groups have no values), returns `[{}]` (Simple Product contract).
 */
export function generateCartesianCombinations(
  groups: OptionGroupInput[] = []
): OptionCombination[] {
  // Filter only groups that have at least one valid value
  const validGroups = groups.filter(
    (g) => g.name.trim() && g.values && g.values.some((v) => v.label.trim())
  );

  if (validGroups.length === 0) {
    return [{}];
  }

  const groupDimensions = validGroups.map((g) => ({
    name: g.name.trim(),
    values: g.values.map((v) => v.label.trim()).filter(Boolean),
  }));

  let combinations: OptionCombination[] = [{}];

  for (const dim of groupDimensions) {
    const next: OptionCombination[] = [];
    for (const currentCombo of combinations) {
      for (const val of dim.values) {
        next.push(
          normalizeOptionCombination({
            ...currentCombo,
            [dim.name]: val,
          })
        );
      }
    }
    combinations = next;
  }

  return combinations;
}

/**
 * Formats a combination into a clean, human-readable display string:
 * e.g. { Color: "Red", Size: "M" } -> "Red / M"
 * e.g. {} -> "Default"
 */
export function formatCombinationLabel(combo?: OptionCombination | null): string {
  const norm = normalizeOptionCombination(combo);
  const values = Object.values(norm);
  if (values.length === 0) {
    return "Default";
  }
  return values.join(" / ");
}

/**
 * Generates a readable, deterministic SKU for a variant given product slug and combination.
 * e.g. slug: "classic-crewneck", combo: { Size: "L", Color: "Navy Blue" }
 * -> "CLASSIC-C-NAV-L"
 */
export function generateVariantSku(
  productSlug: string,
  combo?: OptionCombination | null,
  fallbackIndex?: number
): string {
  const prefix = productSlug
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);

  const norm = normalizeOptionCombination(combo);
  const parts = Object.values(norm).map((val) =>
    val
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4)
  );

  if (parts.length === 0) {
    return fallbackIndex !== undefined ? `${prefix}-DEFAULT-${fallbackIndex}` : `${prefix}-DEFAULT`;
  }

  return `${prefix}-${parts.join("-")}`;
}

/**
 * Determines whether a product is a simple product (single default variant with `{}`).
 */
export function isSimpleProduct(groups?: OptionGroupInput[] | null): boolean {
  if (!groups || groups.length === 0) return true;
  return !groups.some((g) => g.values && g.values.length > 0);
}
