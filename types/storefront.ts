/**
 * types/storefront.ts
 *
 * Storefront domain & UI component prop types.
 *
 * Contains types for:
 *  - Product filters & sorting options
 *  - Search query parameters
 *  - Navigation items
 *  - Cart drawer state
 *  - Checkout steps & state
 */

import type { ProductWithDetails } from "@/lib/db/products";
import type { CategoryRow } from "@/lib/db/categories";

// ---------------------------------------------------------------------------
// Product Listing, Filtering & Sorting
// ---------------------------------------------------------------------------

export type ProductSortOption =
  | "featured"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export interface ProductFilterState {
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  featuredOnly?: boolean;
  search?: string;
  sort?: ProductSortOption;
  page?: number;
  limit?: number;
}

export interface ProductCatalogData {
  products: ProductWithDetails[];
  totalCount: number;
  categories: CategoryRow[];
  currentPage: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// PDP (Product Detail Page)
// ---------------------------------------------------------------------------

export interface VariantOptionGroup {
  name: string; // e.g. "Color", "Size"
  values: string[]; // e.g. ["Red", "Blue"], ["S", "M", "L"]
}

export interface SelectedVariantState {
  variantId: string | null;
  sku: string | null;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  stockQuantity: number;
  imageIndex: number;
  options: Record<string, string>; // e.g. { Color: "Red", Size: "M" }
}

// ---------------------------------------------------------------------------
// Shopping Cart UI
// ---------------------------------------------------------------------------

export interface CartDrawerState {
  isOpen: boolean;
  isUpdating: boolean;
  activeLineId: string | null;
}

// ---------------------------------------------------------------------------
// Checkout Flow
// ---------------------------------------------------------------------------

export type CheckoutStep = "contact" | "shipping" | "payment" | "review";

export interface CheckoutFormState {
  email: string;
  fullName: string;
  phone: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  shippingMethodId?: string;
  paymentMethod: "paystack" | "flutterwave" | "bank_transfer";
  promoCode?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchResultItem {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  imageUrl: string | null;
  categoryName: string | null;
  inStock: boolean;
}
