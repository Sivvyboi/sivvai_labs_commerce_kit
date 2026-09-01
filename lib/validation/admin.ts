/**
 * lib/validation/admin.ts
 *
 * Zod schemas for all admin form inputs.
 *
 * These are used by admin Server Actions to validate incoming form data before
 * delegating to services. They extend the existing storefront schemas where applicable
 * rather than duplicating field definitions.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const CreateProductAdminSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  description: z.string().optional(),
  category_id: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().uuid("Invalid category").optional().nullable()
  ),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  base_price: z.coerce.number().min(0, "Price must be 0 or greater"),
  sale_price: z.coerce.number().min(0).optional().nullable(),
  compare_at_price: z.coerce.number().min(0).optional().nullable(),
  cost_price: z.coerce.number().min(0).optional().nullable(),
  is_featured: z.boolean().default(false),
  seo_title: z.string().max(70).optional().nullable(),
  seo_description: z.string().max(160).optional().nullable(),
  sku: z.string().optional().nullable(),
  // Initial inventory (applied after product creation)
  initial_stock: z.coerce.number().int().min(0).optional().default(0),
  track_inventory: z.boolean().optional().default(true),
});

export type CreateProductAdminInput = z.infer<typeof CreateProductAdminSchema>;

export const UpdateProductMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Product name is required").optional(),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only").optional(),
  description: z.string().optional().nullable(),
  category_id: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().uuid("Invalid category").optional().nullable()
  ),
  base_price: z.coerce.number().min(0, "Price must be 0 or greater").optional(),
  sale_price: z.coerce.number().min(0).optional().nullable(),
  compare_at_price: z.coerce.number().min(0).optional().nullable(),
  cost_price: z.coerce.number().min(0).optional().nullable(),
  is_featured: z.boolean().optional(),
  seo_title: z.string().max(70).optional().nullable(),
  seo_description: z.string().max(160).optional().nullable(),
});

export type UpdateProductMetadataInput = z.infer<typeof UpdateProductMetadataSchema>;

export const UpdateProductAdminSchema = UpdateProductMetadataSchema;
export type UpdateProductAdminInput = UpdateProductMetadataInput;

// ---------------------------------------------------------------------------
// Option Groups & Values
// ---------------------------------------------------------------------------

export const CreateOptionGroupSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string().min(1, "Option group name is required"),
});

export type CreateOptionGroupInput = z.infer<typeof CreateOptionGroupSchema>;

export const CreateOptionValueSchema = z.object({
  option_group_id: z.string().uuid(),
  label: z.string().min(1, "Option value label is required"),
});

export type CreateOptionValueInput = z.infer<typeof CreateOptionValueSchema>;

// ---------------------------------------------------------------------------
// Variants (edit-only: SKU, price override, stock)
// ---------------------------------------------------------------------------

export const UpdateVariantAdminSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().optional().nullable(),
  price_override: z.coerce.number().min(0).optional().nullable(),
});

export type UpdateVariantAdminInput = z.infer<typeof UpdateVariantAdminSchema>;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const CreateCategoryAdminSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
});

export type CreateCategoryAdminInput = z.infer<typeof CreateCategoryAdminSchema>;

export const UpdateCategoryAdminSchema = CreateCategoryAdminSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateCategoryAdminInput = z.infer<typeof UpdateCategoryAdminSchema>;

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const UpdateInventoryAdminSchema = z.object({
  inventory_record_id: z.string().uuid(),
  variant_id: z.string().uuid(),
  new_quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  reason: z.string().min(1, "Reason is required for manual adjustments").optional(),
});

export type UpdateInventoryAdminInput = z.infer<typeof UpdateInventoryAdminSchema>;

export const ReleaseInventoryReservationSchema = z.object({
  reservation_id: z.string().uuid("Invalid reservation ID"),
  inventory_record_id: z.string().uuid("Invalid inventory record ID").optional(),
});

export type ReleaseInventoryReservationInput = z.infer<typeof ReleaseInventoryReservationSchema>;

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const OrderStatusValues = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
] as const;

export const UpdateOrderStatusAdminSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(OrderStatusValues),
  note: z.string().optional(),
});

export type UpdateOrderStatusAdminInput = z.infer<typeof UpdateOrderStatusAdminSchema>;

export const AddOrderNoteAdminSchema = z.object({
  order_id: z.string().uuid(),
  body: z.string().min(1, "Note cannot be empty"),
  author_type: z.enum(["admin", "system", "customer"]).default("admin"),
});

export type AddOrderNoteAdminInput = z.infer<typeof AddOrderNoteAdminSchema>;

// ---------------------------------------------------------------------------
// Promotions
// ---------------------------------------------------------------------------

export const BasePromotionAdminSchema = z.object({
  name: z.string().trim().min(1, "Promotion name is required"),
  type: z.enum(["percentage", "fixed_amount"]),
  value: z.coerce.number().positive("Discount value must be positive"),
  // Coupon code
  code: z
    .string()
    .trim()
    .min(3, "Code must be at least 3 characters")
    .toUpperCase(),
  max_uses: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.coerce
      .number()
      .int("Max usage limit must be a whole number")
      .positive("Max usage limit must be at least 1")
      .nullable()
      .optional()
  ),
  starts_at: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.string().nullable().optional()
  ),
  ends_at: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.string().nullable().optional()
  ),
  is_active: z.boolean().default(true),
});

export const CreatePromotionAdminSchema = BasePromotionAdminSchema.refine(
  (data) => {
    if (data.type === "percentage") {
      return data.value > 0 && data.value <= 100;
    }
    return data.value > 0;
  },
  {
    message: "Percentage discount must be between 1% and 100%",
    path: ["value"],
  }
);

export type CreatePromotionAdminInput = z.infer<typeof CreatePromotionAdminSchema>;

export const UpdatePromotionAdminSchema = BasePromotionAdminSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdatePromotionAdminInput = z.infer<typeof UpdatePromotionAdminSchema>;

// ---------------------------------------------------------------------------
// Store Settings
// ---------------------------------------------------------------------------

export const UpdateStoreSettingsAdminSchema = z.object({
  currency: z.string().length(3, "Currency must be a 3-letter ISO code").optional(),
  tax_mode: z.enum(["inclusive", "exclusive", "none"]).optional(),
  active_payment_provider: z.string().optional().nullable(),
});

export type UpdateStoreSettingsAdminInput = z.infer<typeof UpdateStoreSettingsAdminSchema>;

export const UpdateBrandProfileAdminSchema = z.object({
  name: z.string().min(1).optional(),
  logo_url: z.string().url("Must be a valid URL").optional().nullable(),
  contact_email: z.string().email("Must be a valid email").optional(),
  contact_phone: z.string().optional().nullable(),
  seo_title: z.string().max(70).optional().nullable(),
});

export type UpdateBrandProfileAdminInput = z.infer<typeof UpdateBrandProfileAdminSchema>;

export const UpdateFeatureFlagAdminSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
});

export type UpdateFeatureFlagAdminInput = z.infer<typeof UpdateFeatureFlagAdminSchema>;

// ---------------------------------------------------------------------------
// Admin list filters (shared)
// ---------------------------------------------------------------------------

export const AdminListParamsSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type AdminListParams = z.infer<typeof AdminListParamsSchema>;

export const AdminOrdersFilterSchema = AdminListParamsSchema.extend({
  status: z.enum([...OrderStatusValues, "all"]).optional().default("all"),
  period: z.enum(["today", "7d", "30d", "all"]).optional().default("all"),
});

export type AdminOrdersFilter = z.infer<typeof AdminOrdersFilterSchema>;

// ---------------------------------------------------------------------------
// Shipping & Fulfilment
// ---------------------------------------------------------------------------

export const CreateShippingZoneSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  regions: z.array(z.string().min(1)).min(1, "At least one region/state is required"),
});

export type CreateShippingZoneInput = z.infer<typeof CreateShippingZoneSchema>;

export const UpdateShippingZoneSchema = z.object({
  id: z.string().uuid("Invalid zone ID"),
  name: z.string().min(1, "Zone name is required").optional(),
  regions: z.array(z.string().min(1)).min(1, "At least one region/state is required").optional(),
});

export type UpdateShippingZoneInput = z.infer<typeof UpdateShippingZoneSchema>;

export const FulfilmentMethodTypeValues = ["pickup", "local_delivery", "courier"] as const;

export const CreateFulfilmentMethodSchema = z.object({
  type: z.enum(FulfilmentMethodTypeValues),
  name: z.string().min(1, "Method name is required"),
  description: z.string().optional().nullable(),
  is_enabled: z.boolean().default(true),
  estimated_days_min: z.coerce.number().int().min(0, "Minimum delivery days cannot be negative").default(1),
  estimated_days_max: z.coerce.number().int().min(0, "Maximum delivery days cannot be negative").default(5),
});

export type CreateFulfilmentMethodInput = z.infer<typeof CreateFulfilmentMethodSchema>;

export const UpdateFulfilmentMethodSchema = z.object({
  id: z.string().uuid("Invalid method ID"),
  type: z.enum(FulfilmentMethodTypeValues).optional(),
  name: z.string().min(1, "Method name is required").optional(),
  description: z.string().optional().nullable(),
  is_enabled: z.boolean().optional(),
  estimated_days_min: z.coerce.number().int().min(0).optional(),
  estimated_days_max: z.coerce.number().int().min(0).optional(),
});

export type UpdateFulfilmentMethodInput = z.infer<typeof UpdateFulfilmentMethodSchema>;

export const ShippingRateTypeValues = ["flat", "weight_based", "free_above"] as const;

export const UpsertShippingRateSchema = z.object({
  id: z.string().uuid().optional(),
  fulfilment_method_id: z.string().uuid("Invalid fulfilment method ID"),
  zone_id: z.string().uuid("Invalid shipping zone ID"),
  rate_type: z.enum(ShippingRateTypeValues).default("flat"),
  flat_amount: z.coerce.number().min(0, "Flat amount must be 0 or greater").default(0),
  per_kg_amount: z.coerce.number().min(0).default(0),
  free_above_order_total: z.coerce.number().min(0).optional().nullable(),
});

export type UpsertShippingRateInput = z.infer<typeof UpsertShippingRateSchema>;

