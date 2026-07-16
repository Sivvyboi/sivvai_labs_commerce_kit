# Sivvai Labs Commerce Kit — Database Schema Reference (v1.0)

This document provides a detailed, table-by-table reference of the PostgreSQL schema running on Supabase for the Sivvai Labs Commerce Kit.

---

## 1. Store Configuration (Storefront & Profile)

### 1.1 `brand_profile`
Enforces a single-row profile for the store (e.g. name, logo, SEO metadata).
* **Constraints**: 
  * `id` must be `'00000000-0000-0000-0000-000000000000'::UUID` (enforced via `CHECK (id = '00000000-0000-0000-0000-000000000000'::uuid)`).
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `name` TEXT NOT NULL
  * `logo_url` TEXT
  * `seo_title` TEXT
  * `created_at` TIMESTAMPTZ NOT NULL (default: `now()`)
  * `updated_at` TIMESTAMPTZ NOT NULL (default: `now()`)

### 1.2 `store_settings`
Enforces a single-row store configuration (e.g., currency, tax setup).
* **Constraints**: 
  * `id` must be `'00000000-0000-0000-0000-000000000000'::UUID` (enforced via `CHECK (id = '00000000-0000-0000-0000-000000000000'::uuid)`).
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `currency` VARCHAR(3) NOT NULL (default: `'NGN'`)
  * `tax_mode` TEXT NOT NULL (default: `'inclusive'`)
  * `active_payment_provider` TEXT
  * `created_at` TIMESTAMPTZ NOT NULL (default: `now()`)
  * `updated_at` TIMESTAMPTZ NOT NULL (default: `now()`)

### 1.3 `feature_flags`
Key-value store mapping feature identifiers to their enablement state.
* **Columns**:
  * `id` UUID PRIMARY KEY (default: `gen_random_uuid()`)
  * `key` TEXT NOT NULL UNIQUE (indexed for fast lookups)
  * `enabled` BOOLEAN NOT NULL (default: `false`)
  * `metadata` JSONB
  * `created_at` TIMESTAMPTZ NOT NULL (default: `now()`)
  * `updated_at` TIMESTAMPTZ NOT NULL (default: `now()`)

---

## 2. Catalog

### 2.1 `categories`
Hierarchical category structure for catalog organization.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `parent_id` UUID REFERENCES `categories(id) ON DELETE SET NULL` (Self-referential)
  * `name` TEXT NOT NULL
  * `slug` TEXT NOT NULL UNIQUE (URL routing)
  * `archived_at` TIMESTAMPTZ
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 2.2 `products`
Central product entity in the catalog.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `category_id` UUID REFERENCES `categories(id) ON DELETE SET NULL`
  * `slug` TEXT NOT NULL UNIQUE (URL routing)
  * `name` TEXT NOT NULL
  * `description` TEXT
  * `status` `product_status` NOT NULL (default: `'draft'`)
  * `visibility` `product_visibility` NOT NULL (default: `'public'`)
  * `published_at` TIMESTAMPTZ
  * `base_price` INT8 NOT NULL (stored in kobo/cents)
  * `sale_price` INT8
  * `compare_at_price` INT8
  * `cost_price` INT8
  * `is_featured` BOOLEAN NOT NULL (default: `false`)
  * `seo_title` TEXT (Embedded value object)
  * `seo_description` TEXT (Embedded value object)
  * `seo_keywords` TEXT[] (Embedded value object)
  * `archived_at` TIMESTAMPTZ
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 2.3 `product_images`
Images associated with products.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `product_id` UUID REFERENCES `products(id) ON DELETE CASCADE`
  * `url` TEXT NOT NULL
  * `alt_text` TEXT
  * `display_order` INT NOT NULL (default: `0`)
  * `is_primary` BOOLEAN NOT NULL (default: `false`)
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 2.4 `option_groups`
Defines variant dimensions (e.g. "Size", "Color").
* **Constraints**: Unique combination of `(product_id, name)`.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `product_id` UUID REFERENCES `products(id) ON DELETE CASCADE`
  * `name` TEXT NOT NULL
  * `display_order` INT NOT NULL (default: `0`)
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 2.5 `option_values`
Values within a variant group (e.g., "M", "L", "Red").
* **Constraints**: Unique combination of `(option_group_id, label)`.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `option_group_id` UUID REFERENCES `option_groups(id) ON DELETE CASCADE`
  * `label` TEXT NOT NULL
  * `display_order` INT NOT NULL (default: `0`)
  * `swatch_type` TEXT (CHECK `swatch_type IN ('color', 'image', 'none')`)
  * `swatch_value` TEXT
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 2.6 `product_variants`
The purchasable atom of a product.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `product_id` UUID REFERENCES `products(id) ON DELETE CASCADE`
  * `image_id` UUID REFERENCES `product_images(id) ON DELETE SET NULL`
  * `sku` TEXT UNIQUE
  * `option_combination` JSONB NOT NULL (e.g., `{"Size": "M", "Color": "Red"}`)
  * `price_override` INT8
  * `is_default` BOOLEAN NOT NULL (default: `false`)
  * `status` `variant_status` NOT NULL (default: `'active'`)
  * `archived_at` TIMESTAMPTZ
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 2.7 `collections`
Curated groupings of products (e.g., "Summer Essentials").
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `slug` TEXT NOT NULL UNIQUE (URL routing)
  * `name` TEXT NOT NULL
  * `description` TEXT
  * `image_url` TEXT
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 2.8 `tags`
Flat organization labels.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `slug` TEXT NOT NULL UNIQUE
  * `name` TEXT NOT NULL
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 2.9 `product_tags`
Many-to-many join table between products and tags.
* **Columns**:
  * `product_id` UUID REFERENCES `products(id) ON DELETE CASCADE`
  * `tag_id` UUID REFERENCES `tags(id) ON DELETE CASCADE`
  * PRIMARY KEY: `(product_id, tag_id)`

### 2.10 `collection_products`
Many-to-many join table between collections and products.
* **Columns**:
  * `collection_id` UUID REFERENCES `collections(id) ON DELETE CASCADE`
  * `product_id` UUID REFERENCES `products(id) ON DELETE CASCADE`
  * `display_order` INT NOT NULL (default: `0`)
  * PRIMARY KEY: `(collection_id, product_id)`

---

## 3. Inventory

### 3.1 `inventory_records`
Holds stock tracking data for each product variant (1-to-1).
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `variant_id` UUID NOT NULL UNIQUE REFERENCES `product_variants(id) ON DELETE CASCADE`
  * `on_hand_quantity` INT NOT NULL (default: `0`)
  * `reserved_quantity` INT NOT NULL (default: `0`)
  * `incoming_quantity` INT NOT NULL (default: `0`)
  * `low_stock_threshold` INT NOT NULL (default: `5`)
  * `track_inventory` BOOLEAN NOT NULL (default: `true`)
  * `allow_backorders` BOOLEAN NOT NULL (default: `false`)
  * `available_quantity` INT GENERATED ALWAYS AS (on_hand_quantity - reserved_quantity) STORED
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 3.2 `stock_movements`
Append-only log of stock entries (audit log).
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `inventory_record_id` UUID NOT NULL REFERENCES `inventory_records(id) ON DELETE RESTRICT`
  * `movement_type` `stock_movement_type` NOT NULL
  * `quantity_delta` INT NOT NULL
  * `reason` TEXT
  * `reference_id` UUID (ID of referring entity, e.g. order_id)
  * `performed_by` TEXT
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 3.3 `inventory_reservations`
Tracks temporary stock holds placed during checkout and virtual-account payment windows (e.g. bank-transfer pay-later).

This table is the **source of truth for reserved stock**. The `reserved_quantity` column on `inventory_records` is automatically maintained by a PostgreSQL trigger (`sync_inventory_reservation`) — **application code must never write `reserved_quantity` directly**.

**Reservation lifecycle:**
| Status | Meaning |
|---|---|
| `active` | Hold is live; stock is unavailable to other buyers |
| `released` | Hold was explicitly cancelled (e.g. item removed from cart) |
| `expired` | Hold timed out before checkout completed |
| `converted` | Hold was consumed by a finalised order (stock movement recorded) |

**Trigger rules (`sync_inventory_reservation`):**
- `INSERT` active → `+quantity` on `reserved_quantity`
- `UPDATE` active→active, qty changed → `+/- delta` on `reserved_quantity`
- `UPDATE` active→other → `-old.quantity` on `reserved_quantity`
- `UPDATE` other→active → `+new.quantity` on `reserved_quantity`
- `DELETE` (was active) → `-old.quantity` on `reserved_quantity`
- `GREATEST(0, ...)` guards against negative values from out-of-order operations.

**Soft references** — `cart_id`, `checkout_session_id`, and `order_id` are plain `UUID` columns with **no database-level foreign key constraint**. FK constraints are omitted because those tables are created in later migrations (008, 009, 011); referential integrity is enforced at the application layer. Only one of these three should be non-null per row, indicating which context created the reservation.

* **Columns**:
  * `id` UUID PRIMARY KEY
  * `inventory_record_id` UUID NOT NULL REFERENCES `inventory_records(id) ON DELETE RESTRICT`
  * `cart_id` UUID (soft reference — no FK constraint)
  * `checkout_session_id` UUID (soft reference — no FK constraint)
  * `order_id` UUID (soft reference — no FK constraint)
  * `quantity` INT NOT NULL (CHECK `quantity > 0`)
  * `status` `reservation_status` NOT NULL (default: `'active'`)
  * `expires_at` TIMESTAMPTZ NOT NULL
  * `released_at` TIMESTAMPTZ
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

* **Indexes**:
  * B-tree on `inventory_record_id`
  * Partial B-tree on `cart_id` WHERE NOT NULL
  * Partial B-tree on `checkout_session_id` WHERE NOT NULL
  * Partial B-tree on `order_id` WHERE NOT NULL
  * Partial B-tree on `(inventory_record_id)` WHERE `status = 'active'` — fast live-hold lookup

* **RLS**: Enabled with **no policies** → deny-all for `anon`/`authenticated`. All access is via the service role key on the server.

---

## 4. Customers

### 4.1 `customers`
Customer accounts linked to Supabase authentication.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `auth_id` UUID UNIQUE REFERENCES `auth.users(id) ON DELETE SET NULL`
  * `email` TEXT NOT NULL UNIQUE
  * `phone` TEXT
  * `first_name` TEXT
  * `last_name` TEXT
  * `status` `customer_status` NOT NULL (default: `'active'`)
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 4.2 `customer_addresses`
Addresses saved by customers.
* **Constraints**: A trigger enforces that a customer can have only one address marked as `is_default = true`. Setting a new default clears the others.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `customer_id` UUID NOT NULL REFERENCES `customers(id) ON DELETE CASCADE`
  * `label` TEXT
  * `first_name` TEXT
  * `last_name` TEXT
  * `phone` TEXT
  * `street_line_1` TEXT NOT NULL
  * `street_line_2` TEXT
  * `city` TEXT NOT NULL
  * `state` TEXT NOT NULL
  * `postal_code` TEXT
  * `country` TEXT NOT NULL (default: `'NG'`)
  * `is_default` BOOLEAN NOT NULL (default: `false`)
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

---

## 5. Cart & Checkout

### 5.1 `carts`
Guest or customer shopping sessions.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `customer_id` UUID REFERENCES `customers(id) ON DELETE SET NULL`
  * `status` `cart_status` NOT NULL (default: `'active'`)
  * `expires_at` TIMESTAMPTZ NOT NULL (default: 30 days from creation)
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 5.2 `cart_lines`
Individual lines in a shopping cart.
* **Constraints**: Unique combination of `(cart_id, variant_id)`.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `cart_id` UUID NOT NULL REFERENCES `carts(id) ON DELETE CASCADE`
  * `variant_id` UUID NOT NULL REFERENCES `product_variants(id) ON DELETE CASCADE`
  * `quantity` INT NOT NULL (default: `1`, CHECK `quantity > 0`)
  * `unit_price_snapshot` INT8
  * `added_at` TIMESTAMPTZ NOT NULL
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 5.3 `checkout_sessions`
Transient checkout records before order compilation.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `cart_id` UUID NOT NULL REFERENCES `carts(id) ON DELETE CASCADE`
  * `customer_id` UUID REFERENCES `customers(id) ON DELETE SET NULL`
  * `guest_contact` JSONB (Embedded contact info for guest checkout)
  * `shipping_address` JSONB (Structured address snapshot)
  * `fulfilment_method_id` UUID REFERENCES `fulfilment_methods(id) ON DELETE SET NULL`
  * `payment_method` TEXT
  * `promo_code` TEXT
  * `idempotency_key` TEXT UNIQUE (to protect payment processing)
  * `status` `checkout_status` NOT NULL (default: `'open'`)
  * `expires_at` TIMESTAMPTZ NOT NULL (default: 1 hour from creation)
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

---

## 6. Shipping & Fulfilment

### 6.1 `fulfilment_methods`
Pickup, delivery, or nationwide shipping methods.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `type` `fulfilment_type` NOT NULL
  * `name` TEXT NOT NULL
  * `is_enabled` BOOLEAN NOT NULL (default: `false`)
  * `estimated_days_min` INT
  * `estimated_days_max` INT
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 6.2 `shipping_zones`
Geographical grouping of shipping areas (e.g. Lagos State, Nationwide).
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `name` TEXT NOT NULL
  * `regions` TEXT[] NOT NULL (default: `{}`)
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 6.3 `shipping_rates`
Defines shipping costs per zone and method.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `fulfilment_method_id` UUID NOT NULL REFERENCES `fulfilment_methods(id) ON DELETE CASCADE`
  * `zone_id` UUID NOT NULL REFERENCES `shipping_zones(id) ON DELETE CASCADE`
  * `rate_type` `shipping_rate_type` NOT NULL (default: `'flat'`)
  * `flat_amount` INT8 NOT NULL (default: `0`)
  * `per_kg_amount` INT8 NOT NULL (default: `0`)
  * `free_above_order_total` INT8
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

---

## 7. Orders

### 7.1 `orders`
Authoritative purchase records.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `customer_id` UUID REFERENCES `customers(id) ON DELETE SET NULL`
  * `order_number` TEXT NOT NULL UNIQUE (human-readable order identifier)
  * `guest_contact` JSONB (Structured metadata snapshot for guest checkouts)
  * `status` `order_status` NOT NULL (default: `'pending'`)
  * `shipping_address` JSONB NOT NULL (Immutable address snapshot)
  * `billing_address` JSONB (Immutable address snapshot)
  * `shipping_method_snapshot` JSONB (Fulfillment details at checkout)
  * `shipping_rate_snapshot` JSONB (Pricing rule snapshot)
  * `subtotal` INT8 NOT NULL (default: `0`)
  * `shipping_total` INT8 NOT NULL (default: `0`)
  * `discount_total` INT8 NOT NULL (default: `0`)
  * `tax_total` INT8 NOT NULL (default: `0`)
  * `grand_total` INT8 NOT NULL (default: `0`)
  * `currency` VARCHAR(3) NOT NULL (default: `'NGN'`)
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 7.2 `order_lines`
Individual snapshot-based line items for a finalized order.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `order_id` UUID NOT NULL REFERENCES `orders(id) ON DELETE CASCADE`
  * `variant_id` UUID REFERENCES `product_variants(id) ON DELETE RESTRICT` (prevents variant deletion)
  * `product_name_snapshot` TEXT NOT NULL
  * `variant_label_snapshot` TEXT
  * `sku_snapshot` TEXT
  * `image_url_snapshot` TEXT
  * `unit_price_snapshot` INT8 NOT NULL
  * `quantity` INT NOT NULL (CHECK `quantity > 0`)
  * `line_total` INT8 NOT NULL
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 7.3 `order_status_events`
Append-only order state transition timeline log.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `order_id` UUID NOT NULL REFERENCES `orders(id) ON DELETE RESTRICT`
  * `from_status` `order_status`
  * `to_status` `order_status` NOT NULL
  * `actor` TEXT NOT NULL
  * `note` TEXT
  * `created_at` TIMESTAMPTZ NOT NULL

### 7.4 `order_notes`
Merchant or customer text annotations on an order.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `order_id` UUID NOT NULL REFERENCES `orders(id) ON DELETE CASCADE`
  * `body` TEXT NOT NULL
  * `author_type` `note_author_type` NOT NULL
  * `created_at` TIMESTAMPTZ NOT NULL

---

## 8. Payments

### 8.1 `payment_attempts`
Records individual payment attempts for orders (1-to-many).
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `order_id` UUID NOT NULL REFERENCES `orders(id) ON DELETE RESTRICT`
  * `attempt_number` INT NOT NULL (default: `1`)
  * `provider` TEXT NOT NULL (e.g. 'paystack', 'flutterwave')
  * `provider_reference` TEXT UNIQUE (webhook lookup)
  * `idempotency_key` TEXT NOT NULL UNIQUE (retry safety)
  * `amount` INT8 NOT NULL (default: `0`)
  * `currency` VARCHAR(3) NOT NULL (default: `'NGN'`)
  * `status` `payment_status` NOT NULL (default: `'pending'`)
  * `initiated_at` TIMESTAMPTZ NOT NULL (default: `now()`)
  * `confirmed_at` TIMESTAMPTZ
  * `metadata` JSONB
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 8.2 `payment_events`
Append-only log of raw webhook payloads/payment events.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `payment_attempt_id` UUID NOT NULL REFERENCES `payment_attempts(id) ON DELETE RESTRICT`
  * `event_type` TEXT NOT NULL
  * `raw_payload` JSONB
  * `created_at` TIMESTAMPTZ NOT NULL

---

## 9. Notifications

### 9.1 `notification_templates`
Message layouts configured per event (SMS, WhatsApp, Email).
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `event_type` TEXT NOT NULL UNIQUE (e.g. `'order.placed'`)
  * `channel` `notification_channel` NOT NULL
  * `subject_template` TEXT
  * `body_template` TEXT NOT NULL
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 9.2 `notification_logs`
Records sent notification logs.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `order_id` UUID REFERENCES `orders(id) ON DELETE SET NULL`
  * `customer_id` UUID REFERENCES `customers(id) ON DELETE SET NULL`
  * `channel` `notification_channel` NOT NULL
  * `recipient` TEXT NOT NULL
  * `status` `notification_status` NOT NULL (default: `'pending'`)
  * `sent_at` TIMESTAMPTZ
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

---

## 10. Promotions (Scaffolded / Future-ready)

### 10.1 `promotions`
Rule definition container for coupons and discounts.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `name` TEXT NOT NULL
  * `type` `promotion_type` NOT NULL
  * `value` INT8 NOT NULL (default: `0`)
  * `starts_at` TIMESTAMPTZ
  * `ends_at` TIMESTAMPTZ
  * `is_active` BOOLEAN NOT NULL (default: `false`)
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 10.2 `promotion_rules`
Eligibility constraints for promotion activations.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `promotion_id` UUID NOT NULL REFERENCES `promotions(id) ON DELETE CASCADE`
  * `rule_type` TEXT NOT NULL
  * `conditions` JSONB NOT NULL (default: `'{}'::jsonb`)
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL

### 10.3 `coupon_codes`
Redeemable codes mapping to promotions.
* **Columns**:
  * `id` UUID PRIMARY KEY
  * `promotion_id` UUID NOT NULL REFERENCES `promotions(id) ON DELETE CASCADE`
  * `code` TEXT NOT NULL UNIQUE
  * `max_uses` INT
  * `current_uses` INT NOT NULL (default: `0`)
  * `max_uses_per_customer` INT
  * `created_at` TIMESTAMPTZ NOT NULL
  * `updated_at` TIMESTAMPTZ NOT NULL
