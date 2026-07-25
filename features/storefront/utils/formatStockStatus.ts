/**
 * features/storefront/utils/formatStockStatus.ts
 *
 * Pure helper utility for resolving inventory status labels and badge color variants.
 */

export interface StockStatusInfo {
  status: "in_stock" | "low_stock" | "out_of_stock";
  label: string;
  variant: "default" | "warning" | "destructive";
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
