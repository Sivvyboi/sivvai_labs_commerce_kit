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
        [
          k.normalize("NFC").trim(),
          (typeof v === "string" ? v.normalize("NFC").trim() : String(v ?? "").normalize("NFC").trim()),
        ] as [string, string]
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

export type VariantAvailabilityStatus = "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";

export interface VariantInventoryLike {
  on_hand_quantity?: number;
  reserved_quantity?: number;
  track_inventory?: boolean;
  allow_backorders?: boolean;
}

export interface VariantLike {
  id: string;
  product_id?: string;
  image_id?: string | null;
  sku?: string | null;
  option_combination?: OptionCombination | null | unknown;
  price_override?: number | null;
  is_default?: boolean;
  status?: string;
  inventory?: VariantInventoryLike | VariantInventoryLike[] | null;
}

/**
 * Checks whether an active variant has purchasable stock.
 * - Non-active variants are considered not in stock (false).
 * - Untracked inventory or backorder-allowed inventory is considered in stock (true).
 * - Tracked inventory requires available stock (on_hand - reserved > 0).
 */
export function isVariantInStock(variant?: VariantLike | null): boolean {
  if (!variant || variant.status !== "active") return false;
  const inv = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
  if (!inv || !inv.track_inventory || inv.allow_backorders) return true;
  const onHand = inv.on_hand_quantity ?? 0;
  const reserved = inv.reserved_quantity ?? 0;
  return onHand - reserved > 0;
}

/**
 * Deterministically resolves an exact variant from a selection of options.
 *
 * Requirements:
 * 1. If requiredGroupNames is provided (all non-empty option groups for this product),
 *    selections must contain a value for every required group. Incomplete selections return null.
 * 2. Variant must be active.
 * 3. Compares normalized combination with normalized variant combination.
 * 4. STRICTLY ZERO partial fallback. Returns null if no exact active match.
 */
export function resolveVariantByCombination<T extends VariantLike>(
  variants: T[],
  selections?: OptionCombination | null,
  requiredGroupNames?: string[]
): T | null {
  if (!variants || variants.length === 0) return null;
  const normSelections = normalizeOptionCombination(selections);
  const selectedKeys = Object.keys(normSelections);

  // If required group names are specified, verify completeness
  if (requiredGroupNames && requiredGroupNames.length > 0) {
    const cleanRequired = requiredGroupNames.map((g) => g.trim()).filter(Boolean);
    if (cleanRequired.length > 0) {
      const hasAllRequired = cleanRequired.every(
        (group) => Boolean(normSelections[group])
      );
      if (!hasAllRequired) {
        return null;
      }
      if (selectedKeys.length !== cleanRequired.length) {
        return null;
      }
    }
  }

  // Find exact match among active variants
  const match = variants.find((v) => {
    if (v.status !== "active") return false;
    const vCombo = normalizeOptionCombination(v.option_combination as OptionCombination);
    return compareOptionCombinations(vCombo, normSelections);
  });

  return match ?? null;
}

/**
 * Evaluates the availability matrix status for a specific option value candidate,
 * taking into account all other currently selected option groups.
 */
export function getOptionValueMatrixStatus<T extends VariantLike>(
  variants: T[],
  currentSelections: OptionCombination = {},
  targetGroup: string,
  targetValue: string
): {
  status: VariantAvailabilityStatus;
  variantId?: string;
} {
  const normTargetGroup = targetGroup.trim();
  const normTargetValue = targetValue.trim();

  // Construct candidate selections keeping all other selected groups, but replacing targetGroup
  const candidateSelections: OptionCombination = {};
  for (const [k, v] of Object.entries(currentSelections)) {
    const cleanK = k.trim();
    if (cleanK && cleanK !== normTargetGroup && v && v.trim()) {
      candidateSelections[cleanK] = v.trim();
    }
  }
  candidateSelections[normTargetGroup] = normTargetValue;

  // Filter active variants that match all keys present in candidateSelections
  const matchingVariants = variants.filter((v) => {
    if (v.status !== "active") return false;
    const vCombo = normalizeOptionCombination(v.option_combination as OptionCombination);
    return Object.entries(candidateSelections).every(
      ([group, val]) => vCombo[group] === val
    );
  });

  if (matchingVariants.length === 0) {
    return { status: "UNAVAILABLE" };
  }

  // Check if at least one matching active variant is in stock
  const inStockVariant = matchingVariants.find((v) => isVariantInStock(v));
  if (inStockVariant) {
    return {
      status: "AVAILABLE",
      variantId: matchingVariants.length === 1 ? matchingVariants[0].id : undefined,
    };
  }

  return {
    status: "OUT_OF_STOCK",
    variantId: matchingVariants.length === 1 ? matchingVariants[0].id : undefined,
  };
}

/**
 * Builds a multi-dimensional matrix lookup mapping each option group and value to its
 * availability status (AVAILABLE | OUT_OF_STOCK | UNAVAILABLE).
 */
export function buildVariantAvailabilityMatrix<T extends VariantLike>(
  variants: T[],
  optionGroups: OptionGroupInput[],
  currentSelections: OptionCombination = {}
): Record<string, Record<string, { status: VariantAvailabilityStatus; variantId?: string }>> {
  const matrix: Record<
    string,
    Record<string, { status: VariantAvailabilityStatus; variantId?: string }>
  > = {};

  for (const group of optionGroups) {
    const groupName = group.name.trim();
    if (!groupName) continue;
    matrix[groupName] = {};

    for (const valObj of group.values) {
      const valLabel = valObj.label.trim();
      if (!valLabel) continue;

      matrix[groupName][valLabel] = getOptionValueMatrixStatus(
        variants,
        currentSelections,
        groupName,
        valLabel
      );
    }
  }

  return matrix;
}
