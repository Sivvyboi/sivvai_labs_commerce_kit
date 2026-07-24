# Supabase Database Schema Reference (v1.3)

This document is the authoritative, human-readable reference for the PostgreSQL schema powering the Sivvai Labs Commerce Kit database layer.

---

## 1. Extension Settings

The following extensions are enabled on the database:
- `pgcrypto` — Provides `gen_random_uuid()` for native, high-performance UUID generation, as well as general hashing utilities.
- `pg_trgm` — Enables trigram matching, used for fuzzy full-text storefront searches.

> [!NOTE]
> `uuid-ossp` is intentionally excluded to simplify dependency surface area and maximize database write speed.

---

## 2. Type System Foundations

All domains and enums are defined globally and reusable across the schema to guarantee structural consistency.

### Enums
- `reservation_status` — `('active', 'released', 'converted')`
  - `active`: Reservation is holding stock for an in-progress checkout.
  - `released`: Reservation expired or checkout was abandoned; stock returned to available.
  - `converted`: Checkout completed successfully; reservation converted to a permanent stock debit.

### Reusable Domains
All domains apply database-level validation check constraints:
- `currency_code` — `varchar(3) CHECK (VALUE ~ '^[A-Z]{3}$')` (ISO 4217 uppercase currency codes)
- `country_code` — `varchar(2) CHECK (VALUE ~ '^[A-Z]{2}$')` (ISO 3166-1 alpha-2 uppercase country codes)
- `phone_number` — `varchar(30) CHECK (VALUE ~ '^\+[1-9]\d{1,29}$')` (E.164 international format)
- `email_address` — `varchar(254) CHECK (VALUE ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')` (Standard structural email syntax check)
- `money_amount` — `bigint CHECK (VALUE >= 0)` (Non-negative monetary amounts stored in minor units, e.g. kobo, cents)
- `inventory_quantity` — `integer CHECK (VALUE >= 0)` (Non-negative quantities for inventory stock)

---

## 3. Domain-to-Table Mapping

### Store Configuration
- `brand_profile` — Singleton table containing public store information (name, logo, support contact).
- `store_settings` — Singleton table containing configuration (currency, tax rules, active payment processor).
- `feature_flags` — Key-value flag registry to toggle application capabilities dynamically.

### Catalog
- `categories` — Product categories with self-referencing hierarchy (`parent_id`).
- `products` — Core catalog entity.
- `product_images` — Image assets associated with products.
- `option_groups` — Configurable attribute dimensions (e.g. Size, Color).
- `option_values` — Individual selectable values belonging to option groups.
- `product_variants` — The purchasable items linked to products (representing option configurations).
- `collections` — Curated groupings of products.
- `tags` — Flat labels for products.
- `product_tags` / `collection_products` — Many-to-many join tables.

### Inventory
- `inventory_records` — Tracks physical stock availability (`on_hand`, `reserved`, `incoming`) 1-to-1 per variant.
- `stock_movements` — Append-only journal logging all additions/debits to physical stock.
- `inventory_reservations` — Temporary hold locks created during checkouts.

### Customers & Carts
- `customers` — Buyer registry, linking optionally to Supabase auth users (`auth.users`).
- `customer_addresses` — Delivery addresses.
- `carts` — Shopping carts (active, expired, or merged).
- `cart_lines` — Cart items containing snapshot prices when added.
- `checkout_sessions` — Transient sessions maintaining guest info, addresses, and payment selections during checkouts.

### Shipping & Fulfilment
- `fulfilment_methods` — Store pickup, local delivery, or courier settings.
- `shipping_zones` — Geographic state/region groupings.
- `shipping_rates` — Cost lookup rules matching zones to fulfilment methods.

### Orders & Payments
- `orders` — Authoritative purchase records.
- `order_lines` — Snapshotted line items representing final transaction details.
- `order_status_events` — Lifecycle history tracking changes in order status.
- `order_notes` — buyer and merchant notations.
- `payment_attempts` — Financial ledger containing Paystack/Stripe references.
- `payment_events` — Raw webhook payloads logged for validation.

### Operations
- `notification_templates` — System event message templates.
- `notification_logs` — Sent message audit log.
- `promotions` / `promotion_rules` / `coupon_codes` — Discount and eligibility criteria.

---

## 4. Operational Lifecycles & Rules

### Trigger-Maintained Stock Reservation
`inventory_records.reserved_quantity` is updated via database triggers. Whenever a row in `inventory_reservations` is created, updated, or deleted, `update_reserved_quantity_fn()` recalculates active, unexpired reservations for that record:
```sql
SELECT SUM(quantity) FROM inventory_reservations
WHERE inventory_record_id = target_record_id AND status = 'active' AND expires_at > now()
```

### Reservation Expiry Cleanup
Checkout holds expire after 30 minutes. To return expired holds to the available stock pool:
1. A background cron job selects reservations `WHERE status = 'active' AND expires_at < now()`.
2. It updates `status = 'released'` and set `released_at = now()`.
3. The RLS trigger fires, reducing `reserved_quantity` on the inventory record, making the items immediately available to other shoppers.
4. Finished/expired reservations are permanently archived or purged after 24 hours.

---

## 5. Security & Access Control (RLS)

Row Level Security is enabled globally on all tables.
- **Store config & catalog**: Publicly readable (anon/authenticated) to construct storefronts. Write access is restricted entirely to service roles.
- **Profiles & Addresses**: Authenticated users can read/write their own records (`customer_id` check matching `auth.uid()`).
- **Carts & Checkout**: Users can read/write their own active carts and checkout sessions.
- **Orders & Payments**: Authenticated users can read their own order logs and payment attempt statuses.
- **Internal Logs & Reservations**: Disabled for all public client roles (service-role only).
