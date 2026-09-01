import type { ProductWithDetails, ProductVariantRow } from "@/lib/db/products";

export interface StockStatusInfo {
  status: "in_stock" | "low_stock" | "out_of_stock";
  label: string;
  variant: "default" | "warning" | "destructive";
}

/**
 * Calculates the available quantity for a variant based on its inventory record.
 * - Returns undefined if inventory is not tracked or backorders are allowed (treated as unlimited).
 * - Returns a non-negative integer (on_hand - reserved) if tracked.
 * - Returns 0 if variant is not active.
 */
export function getVariantAvailableStock(
  variant?: ProductVariantRow | null
): number | undefined {
  if (!variant || variant.status !== "active") return 0;
  const inv = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
  if (!inv) return undefined;
  if (!inv.track_inventory || inv.allow_backorders) return undefined;
  return Math.max(0, (inv.on_hand_quantity ?? 0) - (inv.reserved_quantity ?? 0));
}

/**
 * Returns overall stock status summary for a product or specific variant.
 */
export function getProductStockSummary(
  product: ProductWithDetails,
  selectedVariantId?: string
): {
  isAvailable: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
} {
  if (product.status !== "published" || product.archived_at !== null) {
    return { isAvailable: false, stockQuantity: 0 };
  }

  const variants = product.variants ?? [];
  if (variants.length === 0) {
    return { isAvailable: true, stockQuantity: undefined };
  }

  if (selectedVariantId) {
    const variant = variants.find((v) => v.id === selectedVariantId);
    if (!variant || variant.status !== "active") {
      return { isAvailable: false, stockQuantity: 0 };
    }
    const inv = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
    const available = getVariantAvailableStock(variant);
    const isAvailable = available === undefined || available > 0;
    return {
      isAvailable,
      stockQuantity: isAvailable ? available : 0,
      lowStockThreshold: inv?.low_stock_threshold ?? 5,
    };
  }

  // Summary across all active variants
  const activeVariants = variants.filter((v) => v.status === "active");
  if (activeVariants.length === 0) {
    return { isAvailable: false, stockQuantity: 0 };
  }

  let allTracked = true;
  let totalStock = 0;
  let anyInStock = false;
  let minThreshold = 5;

  for (const v of activeVariants) {
    const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
    if (!inv || !inv.track_inventory || inv.allow_backorders) {
      allTracked = false;
      anyInStock = true;
    } else {
      const avail = Math.max(0, (inv.on_hand_quantity ?? 0) - (inv.reserved_quantity ?? 0));
      totalStock += avail;
      if (avail > 0) anyInStock = true;
      if (inv.low_stock_threshold) minThreshold = inv.low_stock_threshold;
    }
  }

  if (!anyInStock || (allTracked && totalStock <= 0)) {
    return { isAvailable: false, stockQuantity: 0, lowStockThreshold: minThreshold };
  }

  return {
    isAvailable: true,
    stockQuantity: allTracked ? totalStock : undefined,
    lowStockThreshold: minThreshold,
  };
}

export function formatStockStatus(
  quantity?: number,
  threshold: number = 5
): StockStatusInfo {
  if (quantity !== undefined && quantity <= 0) {
    return {
      status: "out_of_stock",
      label: "Out of Stock",
      variant: "destructive",
    };
  }

  if (quantity !== undefined && quantity > 0 && quantity <= threshold) {
    return {
      status: "low_stock",
      label: `Only ${quantity} left`,
      variant: "warning",
    };
  }

  return {
    status: "in_stock",
    label: "In Stock",
    variant: "default",
  };
}
