# Commerce Domain Architecture

**Sivvai Labs Commerce Kit — Step 3**
**Classification:** Architecture & Domain Design
**Status:** Approved — v1.1 (post-review refinements applied)
**Prerequisites:** Step 1 (Engineering Foundation), Step 2 (UI Foundation)

---

## Architectural Approach

Before defining any entity, it is worth explaining *why* this architecture is designed the way it is.

The Commerce Kit must serve a wide and genuinely heterogeneous set of business types — a fashion boutique, a bakery, a phone accessories shop, a pet store, and a grocery mini-mart all have legitimately different operational needs. A naive commerce system bakes in assumptions early: it assumes products always have sizes and colors, that all orders require shipping, that inventory is always unit-based, that every customer needs an account.

Every one of those assumptions becomes a structural liability when the domain they target does not apply.

The approach taken here is to design the core domain around *behavioral abstractions* rather than specific product shapes. A product is not "a shirt" or "a phone" — it is an item with zero or more configurable option dimensions, each of which produces a unique purchasable variant. An order is not a "clothing order" or a "food order" — it is a record containing line items, each of which references a variant at a point-in-time price snapshot, fulfilled via a configured fulfillment method.

This means the *schema* never changes when you switch from selling perfumes to selling books. Only the *data* changes. The system remains structurally identical regardless of vertical.

---

## Section 1 — Core Domain Principles

### 1.1 Bounded Contexts

A bounded context is a logical boundary within which a particular domain model applies and has consistent meaning. Terms mean the same thing inside a context, and translations occur at the boundary.

The Commerce Kit is divided into the following bounded contexts:

| Context | Core Concern |
|---|---|
| **Catalog** | What is sold, how it is presented, and how it is discovered |
| **Inventory** | What stock exists, where it is, and whether it can be committed |
| **Pricing** | What something costs, under what conditions |
| **Cart** | What a buyer intends to purchase in a session |
| **Checkout** | How a buyer submits intent and provides fulfilment details |
| **Order** | The authoritative record of a committed purchase |
| **Payment** | External money movement, abstracted from provider |
| **Fulfilment** | How the goods or services reach the buyer |
| **Customer** | Who is buying, including identity and preferences |
| **Promotions** | Conditional price modifications |
| **Notifications** | Asynchronous communication triggered by domain events |
| **Store** | Merchant operational configuration (currency, payments, shipping defaults) |
| **Brand** | Visual identity, SEO, contact details, and storefront presentation |
| **Media** | Asset management for images and future media types |
| **Analytics** | Aggregate read models for business intelligence (future) |

Each context owns its data. No context reads directly from another context's primary store. Cross-context communication happens through domain events or explicit service calls at the application layer.

### 1.2 Aggregates

An aggregate is a cluster of domain objects treated as a single unit for the purposes of data change. Each aggregate has one root entity. All writes must go through the root. External references to internal entities use the aggregate root's identity.

Key aggregates in this domain:

- **Product Aggregate** — root: `Product`, children: `ProductVariant`, `ProductImage`, `ProductOption`, `ProductOptionValue`
- **Order Aggregate** — root: `Order`, children: `OrderLine`, `OrderStatusEvent`, `OrderAddress`
- **Cart Aggregate** — root: `Cart`, children: `CartLine`
- **Customer Aggregate** — root: `Customer`, children: `CustomerAddress`, `CustomerSession`
- **Inventory Aggregate** — root: `InventoryRecord`, children: `StockMovement`
- **Payment Aggregate** — root: `Payment`, children: `PaymentEvent`

### 1.3 Entity Ownership

An entity is owned by exactly one aggregate. If a concept needs to be referenced from multiple aggregates, only the *identity* (ID) crosses the boundary — not the object graph itself.

Example: An `OrderLine` stores the `variant_id` and a snapshot of the variant's price, name, and image at order time. It does not hold a live reference to the `ProductVariant` entity. This means the catalog can change without corrupting historical order records.

### 1.4 Value Objects

Value objects have no identity of their own — they are defined entirely by their properties. They are immutable.

Examples in this domain:

- `Money` — amount + currency code
- `Address` — street, city, state, postal code, country
- `PriceSnapshot` — the price at time of order placement
- `Dimensions` — length, width, height, unit
- `Weight` — magnitude + unit
- `DateRange` — start + end for promotions or availability windows
- `Slug` — validated URL segment for SEO

### 1.5 Relationships

Relationships are described in terms of multiplicity and ownership:

- A `Product` has many `ProductVariants` (owned)
- A `ProductVariant` has one `InventoryRecord` (owned by Inventory context, linked by `variant_id`)
- An `Order` has many `OrderLines` (owned)
- An `OrderLine` references one `ProductVariant` (ID only, plus snapshot)
- A `Customer` has many `CustomerAddresses` (owned)
- A `Cart` has many `CartLines` (owned)
- A `Payment` belongs to one `Order` (linked by `order_id`)

### 1.6 Invariants

Invariants are rules that must always hold within an aggregate:

- A `ProductVariant` must always belong to exactly one `Product`
- An `Order` total must always equal the sum of its line totals plus shipping minus discounts
- `InventoryRecord.available_quantity` must never be negative
- A `Cart` line quantity must be at least 1
- A `Payment` must reference exactly one `Order`
- An `Order` cannot transition to `Cancelled` once it is in `Shipped` or `Delivered` state
- A `ProductOption` on a product must have at least one `ProductOptionValue`

---

## Section 2 — Domain Modules

### 2.1 Catalog Module

**Responsibilities:** Defines the merchant's product offerings. Controls what exists, how it is categorised, what it looks like, and how it is discoverable.

**Owned Entities:**
- `Product`
- `ProductVariant`
- `ProductOption`
- `ProductOptionValue`
- `Category`
- `Collection`
- `Tag`
- `ProductImage`
- `ProductSEO`

**External Dependencies:**
- Inventory (reads available stock per variant to determine display status)
- Pricing (reads effective price per variant)
- Media (delegates image optimisation)

---

### 2.2 Inventory Module

**Responsibilities:** Tracks physical or logical stock levels. Enforces stock reservations during checkout. Processes stock adjustments triggered by order fulfilment, restocking, or manual corrections.

**Owned Entities:**
- `InventoryRecord` (one per variant)
- `StockMovement` (append-only audit log of every change)

**External Dependencies:**
- Catalog (receives variant creation events to initialise inventory records)
- Orders (receives order paid events to decrement stock; receives cancellation events to release reservations)

---

### 2.3 Orders Module

**Responsibilities:** Stores the authoritative, immutable record of all committed purchases. Manages the order lifecycle from creation through final resolution.

**Owned Entities:**
- `Order`
- `OrderLine`
- `OrderAddress`
- `OrderStatusEvent`
- `OrderNote`

**External Dependencies:**
- Payments (listens for payment confirmation events)
- Fulfilment/Shipping (listens for dispatch and delivery events)
- Inventory (emits events consumed by Inventory)
- Notifications (emits events consumed by Notifications)
- Customer (links to `customer_id`; guest orders embed a `GuestContact` value object)

---

### 2.4 Customers Module

**Responsibilities:** Manages identity, contact details, and preferences for registered buyers. Provides guest identity for unauthenticated purchases.

**Owned Entities:**
- `Customer`
- `CustomerAddress`

**External Dependencies:**
- Orders (reads order history via `customer_id`)
- Authentication provider (external — Supabase Auth)

---

### 2.5 Checkout Module

**Responsibilities:** Orchestrates the transition from an active cart to a submitted order. Validates stock availability, applies pricing, collects customer details, selects fulfilment method, and initiates payment.

The Checkout module is primarily an *orchestration service* — it owns no long-lived entities of its own. It coordinates across Catalog, Inventory, Pricing, Payments, and Orders.

**Transient Structures:**
- `CheckoutSession` — ephemeral; holds the intermediate state of a checkout in progress. Expires on completion or timeout.

**External Dependencies:**
- Cart (reads cart state as input)
- Inventory (checks and reserves stock)
- Pricing (calculates final prices including any promotions)
- Orders (creates the resulting Order)
- Payments (initiates the payment flow)
- Shipping (calculates shipping cost)

---

### 2.6 Payments Module

**Responsibilities:** Abstracts all money movement behind a provider-agnostic interface. Tracks payment attempts, statuses, and webhook events.

**Owned Entities:**
- `Payment`
- `PaymentEvent` (append-only log of provider callbacks)

**External Dependencies:**
- Orders (links payments to orders; emits payment confirmation events)
- External providers: Paystack, Flutterwave (via adapters)

---

### 2.7 Shipping / Fulfilment Module

**Responsibilities:** Defines how goods reach the buyer. Supports multiple fulfilment methods. Calculates rates and determines eligibility.

**Owned Entities:**
- `FulfilmentMethod` (pickup, local delivery, nationwide)
- `ShippingZone`
- `ShippingRate`

**External Dependencies:**
- Orders (receives new order events; updates order fulfilment status)
- External couriers (future)

---

### 2.8 Pricing Module

**Responsibilities:** Calculates the effective price for any variant at any point in time, taking into account base price, sale price, and future promotions.

The Pricing module is a *domain service* — it does not own primary entities but reads from Catalog and Promotions to return a resolved price.

**External Dependencies:**
- Catalog (reads variant base and sale prices)
- Promotions (applies conditional adjustments)

---

### 2.9 Promotions Module (Future-Ready)

**Responsibilities:** Defines discount rules that modify prices at the line or cart level. All promotion evaluation is routed exclusively through the Pricing module's pipeline — no promotion logic lives in Checkout or Cart directly. This ensures that any new promotion type added in future (BOGO, tiered discount, bundle pricing) automatically applies everywhere without checkout changes.

**Owned Entities:**
- `Promotion` — the rule definition (type, value, date range, eligibility conditions)
- `PromotionRule` — specific conditions that must be met (minimum order value, specific product/category/collection, customer segment)
- `CouponCode` — a redeemable code linked to a `Promotion`; tracks usage count and per-customer limits

**Supported promotion types (resolved by the Pricing pipeline):**
- Percentage discount (e.g. 20% off)
- Fixed amount discount (e.g. N500 off)
- Free shipping
- Buy X get Y (BOGO) — future
- Bundle pricing — future

**External Dependencies:**
- Pricing (Promotions is called at stage 2 of the Pricing pipeline; it receives line context and returns applicable discount adjustments)
- Checkout (passes the buyer's `promo_code` to the Pricing pipeline; does not evaluate promotions itself)

---

### 2.10 Notifications Module

**Responsibilities:** Listens to domain events emitted by other modules and dispatches transactional messages to buyers and the merchant via WhatsApp, email, or SMS.

**Owned Entities:**
- `NotificationLog` (record of sent messages with outcome)
- `NotificationTemplate` (configurable message templates per event type)

**External Dependencies:**
- Orders (listens for lifecycle events)
- Payments (listens for confirmation or failure events)
- WhatsApp Business API, Email provider, SMS provider (external adapters)

---

### 2.11 Store Configuration Module

**Responsibilities:** Manages all merchant-level configuration. This module is intentionally split into two conceptually distinct singletons to prevent branding concerns from coupling with operational settings.

**`BrandProfile`** — Owns all visual identity and presentation data. Changes here affect how the store *looks*.

**`StoreSettings`** — Owns all operational parameters. Changes here affect how the store *behaves*.

Splitting these now, even though both are singletons today, means that future features (white-labelling, theme switching, multi-tenant brand overrides) do not require touching operational configuration, and vice versa.

**Owned Entities:**
- `BrandProfile` — store name, logo, cover image, brand colours, contact details, social links, SEO defaults
- `StoreSettings` — currency, tax mode, active payment provider, default shipping method, checkout flow options
- `FeatureFlag` — per-feature toggles driving conditional application behaviour

**External Dependencies:**
- All modules (read from `StoreSettings` to determine operational behaviour — e.g. which currency to display, which fulfilment methods are enabled)
- Storefront layout components (read from `BrandProfile` to render the store header, SEO tags, and contact links)

---

## Section 3 — Product Architecture

### 3.1 Design Rationale

A `Product` is the merchant's declaration that something exists for sale. It carries the *marketing* face of an offering: its name, description, images, categories, tags, and SEO metadata.

A `Product` is NOT the thing that gets added to a cart. A `ProductVariant` is. This distinction is critical. Every product has at least one variant. A product with no configurable options (a single-size candle, a specific book) still has exactly one variant — the default variant.

This means all downstream systems (cart, orders, inventory, pricing) operate on variants, not products. The product is a display and discovery concern. The variant is the atomic purchasable unit.

This design supports:
- Physical goods with multiple options (a t-shirt with size and color — multiple variants)
- Single-SKU physical goods (a specific book — one default variant)
- Digital goods (a PDF download — one variant, no inventory tracking)
- Services (a haircut booking — one variant, no inventory)
- Bundled goods (a gift set — one variant with a custom SKU, future)

### 3.2 Product Entity

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary identifier |
| `slug` | Slug value object | URL-safe, unique, SEO-friendly |
| `name` | String | Display name |
| `description` | Long Text | Rich text or markdown |
| `product_type` | Enum | `physical`, `digital`, `service` |
| `status` | Enum | `draft`, `active`, `archived` — controls editability and fulfilment eligibility |
| `visibility` | Enum | `public`, `hidden`, `scheduled` — controls storefront exposure independently of status |
| `published_at` | Timestamp nullable | For `scheduled` visibility: the moment the product becomes public |
| `is_featured` | Boolean | Surfaced in featured carousels |
| `category_id` | FK to Category | Primary browse category |
| `base_price` | Money integer | Standard selling price |
| `compare_at_price` | Money integer nullable | Original price — displayed crossed out |
| `sale_price` | Money integer nullable | Active reduced price |
| `cost_price` | Money integer nullable | Merchant-only, never shown to buyer |
| `seo` | Embedded SEO object | Title, description, OG image |
| `tags` | Many-to-many via ProductTag | For search and filtering |
| `collections` | Many-to-many via CollectionProduct | Curated groupings |
| `created_at` | Timestamp | — |
| `updated_at` | Timestamp | — |
| `archived_at` | Timestamp nullable | Soft-delete marker; set when status transitions to `archived` |

### 3.3 Categories

A hierarchical taxonomy owned by the Catalog module. Categories provide the primary browse structure.

- A category can have a parent category (supports one level of nesting; deeper hierarchies create UX friction in mobile-first apps)
- A product belongs to exactly one primary category
- Categories have slugs for URL routing
- Categories are merchant-defined, not system-defined (no hardcoded "Clothing" or "Electronics")
- Categories carry an `archived_at` timestamp for soft deletion — an archived category is hidden from navigation but all product foreign keys remain intact, preventing orphaned references

### 3.4 Collections

Collections are manually curated groupings. Unlike categories, a product can appear in many collections. Collections support editorial use cases: "Summer Picks", "Best Sellers", "New Arrivals", "Under N5,000".

- A collection has a name, slug, description, and optional cover image
- Collections are explicitly ordered (the merchant controls the display sequence)
- Collections do not need to match category boundaries

### 3.5 Tags

Tags are unstructured labels used for search and filtering. Unlike categories, tags are flat with no hierarchy.

- A tag has a name and a normalised slug
- Tags are shared across products (many-to-many)
- Tags drive faceted filtering on the storefront

### 3.6 SEO Metadata (Value Object)

| Field | Notes |
|---|---|
| `seo_title` | Overrides product name in the page title tag |
| `seo_description` | Used in the meta description tag |
| `og_image_url` | Open Graph image for social sharing |
| `canonical_url` | Optional explicit canonical |

### 3.7 Product Status and Visibility

**Status** controls the product's *operational state* — whether it can be sold and fulfilled.

| Status | Meaning |
|---|---|
| `draft` | Being configured; cannot be purchased even if visibility is `public` |
| `active` | Fully configured and eligible for purchase |
| `archived` | Retired; sets `archived_at`; hidden from all surfaces; historical order references preserved |

**Visibility** controls the product's *storefront exposure* independently of its status. An `active` product can still be hidden or scheduled.

| Visibility | Meaning |
|---|---|
| `public` | Visible to all buyers on the storefront |
| `hidden` | Not discoverable; accessible only via direct URL (for sharing previews or exclusive drops) |
| `scheduled` | Automatically becomes `public` when `published_at` is reached; stays hidden until then |

The combination of status and visibility gives the merchant full control:
- `draft` + any visibility = not purchasable
- `active` + `hidden` = purchasable via direct link only (exclusive access)
- `active` + `scheduled` = countdown launch drop
- `active` + `public` = normal storefront listing
- `archived` + any visibility = unreachable (soft-deleted)

---

## Section 4 — Variant Architecture

### 4.1 Design Philosophy

The variant system is entirely generic. It makes no assumption about what the configurable dimensions are. Instead of columns named `size` or `color`, the system uses an option group to option value to variant matrix model.

This supports any combination of dimensions across any product category:

| Business Type | Example Options |
|---|---|
| Fashion | Size x Color |
| Shoes | UK Size x Color |
| Cosmetics | Shade x Finish |
| Perfumes | Volume (30ml, 50ml, 100ml) |
| Phones | Storage (64GB, 128GB, 256GB) x Color |
| Groceries | Weight (500g, 1kg, 2kg) |
| Bakery items | Flavour x Size |
| Hardware | Length x Material |
| Pet food | Flavour x Weight |
| Subscriptions | Duration (Monthly, Quarterly, Annual) |

### 4.2 Option Groups

An `OptionGroup` defines a configurable dimension at the product level.

| Field | Notes |
|---|---|
| `id` | UUID |
| `product_id` | Owned by a product |
| `name` | Display label: "Size", "Color", "Volume", "Storage" |
| `display_order` | Controls rendering sequence |

A product has zero or more option groups. A product with zero option groups still has one variant (the default variant).

### 4.3 Option Values

An `OptionValue` defines one possible value within an option group.

| Field | Notes |
|---|---|
| `id` | UUID |
| `option_group_id` | Belongs to one group |
| `label` | Display text: "Small", "Red", "100ml", "256GB" |
| `display_order` | Controls the option swatch or button sequence |
| `swatch_type` | Enum: `none`, `color`, `image` |
| `swatch_value` | Hex code or image URL for visual swatches |

### 4.4 Variants

A `ProductVariant` is one specific combination of option values. It is the purchasable atom.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary identifier |
| `product_id` | FK to Product | Parent product |
| `sku` | String | Unique merchant-defined stock-keeping unit |
| `barcode` | String nullable | EAN, UPC, or custom |
| `option_combination` | JSONB | Map of option_group_id to option_value_id |
| `price_override` | Money nullable | If set, overrides product base price |
| `compare_at_price` | Money nullable | Crossed-out original price at variant level |
| `weight` | Weight value object nullable | For shipping cost calculation |
| `dimensions` | Dimensions value object nullable | Length x Width x Height plus unit |
| `is_default` | Boolean | True for the single-option default variant |
| `status` | Enum | `active`, `inactive` |
| `image_id` | FK to ProductImage nullable | Variant-specific image |
| `archived_at` | Timestamp nullable | Soft-delete marker; set when variant is retired |

### 4.5 SKU Strategy

SKUs are merchant-defined strings. The system does not auto-generate SKUs but validates uniqueness globally across the store's variant set. A variant without a merchant-assigned SKU receives a system-generated internal identifier. The barcode field is optional and accommodates any standard (EAN-13, UPC-A, QR, custom).

### 4.6 Price Override Logic

The effective price for a variant is resolved in the following priority order:

1. If `variant.price_override` is set — use `variant.price_override`
2. If `product.sale_price` is set — use `product.sale_price`
3. Otherwise — use `product.base_price`

The `compare_at_price` is always the original price displayed crossed out for perceived value. It is optional.

### 4.7 Stock Ownership

Inventory is owned at the variant level, not the product level. This is because different sizes of the same shirt may have entirely different stock quantities. The Inventory module maintains exactly one `InventoryRecord` per `ProductVariant`.

---

## Section 5 — Inventory Architecture

### 5.1 Design Rationale

Inventory represents the right to fulfil a purchase. It must be accurate, consistent, and never oversold. The key challenge in a commerce context is the window between a buyer committing to purchase and that purchase being confirmed — during which stock must be reserved but not yet permanently decremented.

### 5.2 InventoryRecord

One record per variant. The single source of truth for stock quantities and inventory behaviour policies.

| Field | Notes |
|---|---|
| `id` | UUID |
| `variant_id` | One-to-one with ProductVariant |
| `on_hand_quantity` | Total physical units in possession |
| `reserved_quantity` | Units locked during active checkouts or pending orders |
| `incoming_quantity` | Units expected from a restock (future feature) |
| `low_stock_threshold` | Alert threshold (e.g. alert when available is 5 or below) |
| `track_inventory` | Boolean — when false, inventory quantities are ignored entirely (services, digital goods) |
| `allow_backorders` | Boolean — when true, buyers may purchase even when `available_quantity = 0`; order enters a backorder state |
| `continue_selling_when_out_of_stock` | Boolean — a merchant-facing alias for `allow_backorders`; controls the dashboard label and default checkout behaviour |

**Derived value (never stored):**
`available_quantity = on_hand_quantity - reserved_quantity`

This derived value is the only quantity the storefront should display. When `track_inventory = false`, availability is treated as unlimited regardless of stored quantities. When `allow_backorders = true` and `available_quantity <= 0`, the product is purchasable but the order is flagged with a `backordered` line status.

### 5.3 Stock States

| State | Condition |
|---|---|
| **In Stock** | `available_quantity > 0` |
| **Low Stock** | `available_quantity > 0` and `available_quantity <= low_stock_threshold` |
| **Out of Stock** | `available_quantity = 0` and `allow_backorders = false` |
| **Backordered** | `available_quantity <= 0` and `allow_backorders = true` — purchasable, fulfils when stock arrives |
| **Unlimited** | `track_inventory = false` (services, digital goods) |

### 5.4 Stock Reservation Flow

When a buyer reaches checkout, inventory is reserved (not decremented). If the payment fails or the checkout session expires, the reservation is released.

1. Checkout begins — `reserved_quantity += qty` for each line
2. Payment confirmed — `on_hand_quantity -= qty` and `reserved_quantity -= qty`
3. Payment fails or session expires — `reserved_quantity -= qty` (release)
4. Order cancelled before fulfilment — `on_hand_quantity += qty` (restock)

### 5.5 StockMovement (Audit Log)

Every change to `on_hand_quantity` or `reserved_quantity` is recorded as an immutable append-only event.

| Field | Notes |
|---|---|
| `id` | UUID |
| `inventory_record_id` | FK to InventoryRecord |
| `movement_type` | Enum: `adjustment`, `sale`, `restock`, `reservation`, `release`, `return` |
| `quantity_delta` | Positive or negative integer |
| `reason` | Human-readable note (e.g. "Order 1042 paid", "Manual restock") |
| `reference_id` | Optional FK to Order, Payment, or manual adjustment record |
| `performed_by` | Actor: `system`, `merchant`, `admin` |
| `created_at` | Timestamp |

### 5.6 Consistency Rules

- All inventory mutations must be performed as atomic operations (database transactions)
- No service may directly update `on_hand_quantity` or `reserved_quantity` without also writing a corresponding `StockMovement`
- `available_quantity` must be computed, not stored, to avoid dual-write inconsistency
- Checkout must check `allow_backorders` before blocking on zero stock; if backorders are permitted, reservation proceeds and the order line is flagged `backordered`
- `track_inventory = false` bypasses all quantity checks; no `StockMovement` is written for such variants

---

## Section 6 — Pricing Architecture

### 6.1 Money Representation

All monetary values are stored as **integers in the smallest currency unit** (kobo for NGN, cents for USD). This eliminates floating-point rounding errors. Display formatting is handled at the presentation layer using the `localizationConfig.currency` setting from the existing engineering foundation.

### 6.2 Price Fields

| Field | Owned By | Notes |
|---|---|---|
| `base_price` | Product | The standard selling price in the store's currency |
| `compare_at_price` | Product or Variant | The "was" price — displayed crossed out |
| `price_override` | Variant | Variant-specific price when options affect cost |
| `sale_price` | Product | Temporary reduced price, takes precedence over base |
| `cost_price` | Product merchant-only | Purchase/production cost; never shown to buyers |

### 6.3 Effective Price Resolution — The Pricing Pipeline

All price calculations flow through a single ordered pipeline. Nothing in Checkout, Cart, or Order directly computes a price — they all call the Pricing module and receive a resolved result.

The pipeline stages, in order:

1. **Base resolution** — determine the variant's raw price (variant override → product sale price → product base price)
2. **Promotion evaluation** — apply any active `Promotion` rules (percentage discount, fixed discount, BOGO, free shipping) that match the current cart or line context
3. **Tax computation** — apply tax if `StoreSettings.tax_mode = exclusive`; no-op if inclusive or disabled
4. **Final output** — return a `ResolvedPrice` value object

**`ResolvedPrice` value object:**
- `unit_price` — the final per-unit price the buyer pays after all deductions
- `compare_at_price` — the original price, displayed crossed out (nullable)
- `on_sale` — boolean; true when any discount was applied
- `discount_amount` — the total deduction applied to this line (zero if none)
- `discount_source` — `sale_price`, `promotion`, `coupon`, or `none`

All future promotion types (percentage, fixed, BOGO, bundle discount, coupon code) plug into stage 2 of this pipeline via the Promotions module. The Checkout module never branches on promotion logic directly — it always delegates to the Pricing pipeline and receives a `ResolvedPrice`. This keeps checkout orchestration clean regardless of how complex the promotion rules become.

### 6.4 Tax Architecture

Tax is a separate concern from the base price. The system supports:

- **Inclusive pricing** — tax included in displayed price (common in Nigeria)
- **Exclusive pricing** — tax added at checkout (future/international)

A `StoreSettings.tax_mode` flag controls behaviour. Tax rates are merchant-configured per shipping zone or product category. Tax is not applied in the MVP unless explicitly enabled.

### 6.5 Currency

A single currency is configured at the store level via `StoreSettings.currency`. Multi-currency support is a future expansion (see Section 17). All prices are stored in the store currency. Display conversion is never applied to stored prices.

---

## Section 7 — Cart Architecture

### 7.1 Guest vs Authenticated Carts

| Type | Storage | Identity |
|---|---|---|
| **Guest Cart** | Persistent DB row | Identified by an anonymous `cart_id` stored in a cookie |
| **Authenticated Cart** | Persistent DB row | Linked to `customer_id` |

When a guest authenticates, their guest cart is merged into their authenticated cart. Merge strategy: if the same variant exists in both, quantities are summed (capped at available stock).

### 7.2 Cart Entity

| Field | Notes |
|---|---|
| `id` | UUID — the `cart_id` stored in the buyer's cookie |
| `customer_id` | FK to Customer (null for guest) |
| `status` | Enum: `active`, `converted`, `abandoned`, `expired` |
| `expires_at` | Timestamp — carts expire after configurable idle time (default 7 days) |
| `currency` | Inherited from store settings |
| `notes` | Optional buyer delivery note |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |

### 7.3 CartLine Entity

| Field | Notes |
|---|---|
| `id` | UUID |
| `cart_id` | FK to Cart |
| `variant_id` | FK to ProductVariant |
| `quantity` | Positive integer |
| `unit_price_snapshot` | Price captured when item was added (to show buyer stale price warnings) |
| `added_at` | Timestamp |

### 7.4 Cart Calculations

Cart totals are always computed dynamically on read, never stored. The read model aggregates:

- `subtotal` = sum of (current effective price x quantity) per line
- `shipping_estimate` = computed by Shipping module based on selected method (nullable at cart stage)
- `discount_amount` = applied promotions (nullable)
- `total` = subtotal + shipping_estimate - discount_amount

If a variant's current price differs from the `unit_price_snapshot` in a cart line, the UI displays a price change notice to the buyer.

### 7.5 Cart Expiration

Carts expire after a configurable idle period (default 7 days for active carts). Expired carts are soft-deleted (status set to `expired`) and stock reservations are released. An async background job handles expiration; no cart is forcibly expired during an active checkout session.

---

## Section 8 — Checkout Architecture

### 8.1 Checkout Session

The checkout session is a short-lived transient structure that bridges the cart and the order. It lives only during the checkout interaction.

| Field | Notes |
|---|---|
| `id` | UUID |
| `cart_id` | Source cart |
| `customer_id` | FK to Customer (nullable) |
| `guest_contact` | Embedded: name, email, phone for guest buyers |
| `shipping_address` | Embedded Address value object |
| `billing_address` | Embedded Address value object (defaults to shipping) |
| `fulfilment_method_id` | Selected FulfilmentMethod |
| `delivery_note` | Optional buyer instruction |
| `payment_method` | Selected provider (paystack, flutterwave, etc.) |
| `promo_code` | Applied coupon code (optional) |
| `idempotency_key` | UUID — prevents duplicate payment initiations on retry |
| `status` | Enum: `pending`, `payment_initiated`, `completed`, `failed`, `expired` |
| `expires_at` | Approximately 15 minutes from initiation |

### 8.2 Checkout Steps

The checkout flow is modelled as a sequential series of validations and transformations:

1. **Hydrate** — Load cart, verify all lines still reference active variants
2. **Reserve stock** — Call Inventory to reserve quantities for all lines
3. **Collect contact** — Capture email, phone, name (skipped if authenticated)
4. **Collect address** — Shipping address selection or entry
5. **Select fulfilment** — Choose pickup, local delivery, or nationwide
6. **Calculate totals** — Call Pricing + Promotions + Shipping for final amounts
7. **Select payment** — Buyer selects payment provider
8. **Initiate payment** — Call Payment module, get provider redirect URL or payment reference
9. **Await confirmation** — Poll or await webhook from provider
10. **Create Order** — On payment confirmation, atomically create the Order and consume the CheckoutSession

If any step fails (stock unavailable, address invalid, payment declined), the session moves to `failed`, stock reservations are released, and the buyer is informed.

### 8.3 Idempotency During Checkout

Each checkout session carries a unique `idempotency_key`. If the buyer retries a payment step, the same key is used to prevent duplicate payment initiations. This key is also passed to the payment provider.

---

## Section 9 — Order Architecture

### 9.1 Order Entity

| Field | Notes |
|---|---|
| `id` | UUID |
| `order_number` | Human-readable sequential reference (e.g. SLK-1042) |
| `customer_id` | FK to Customer (nullable — null for guest orders) |
| `guest_contact` | Embedded: name, email, phone (for guest orders) |
| `status` | Enum (see lifecycle below) |
| `shipping_address` | Embedded Address snapshot |
| `billing_address` | Embedded Address snapshot |
| `shipping_method_snapshot` | Embedded snapshot of the fulfilment method name, type, and estimated delivery window at time of order — immutable |
| `shipping_rate_snapshot` | Embedded snapshot of the rate type, calculated amount, and zone name at time of order — immutable |
| `subtotal` | Money integer |
| `shipping_total` | Money integer — the calculated shipping cost charged to the buyer |
| `discount_total` | Money integer |
| `tax_total` | Money integer |
| `grand_total` | Money integer |
| `currency` | ISO 4217 code |
| `notes` | Buyer delivery note |
| `merchant_notes` | Internal merchant annotation |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |

The two shipping snapshot fields ensure that historical orders remain accurate even if the merchant later changes delivery rates, renames fulfilment methods, or restructures shipping zones. They follow the same immutability principle as `OrderLine` snapshots.

### 9.2 OrderLine Entity

| Field | Notes |
|---|---|
| `id` | UUID |
| `order_id` | FK to Order |
| `variant_id` | FK to ProductVariant (retained for reference) |
| `product_name_snapshot` | Captured at order time |
| `variant_label_snapshot` | e.g. "Blue / Large" — captured at order time |
| `sku_snapshot` | Captured at order time |
| `image_url_snapshot` | Captured at order time |
| `unit_price_snapshot` | The price paid — immutable |
| `quantity` | Integer |
| `line_total` | unit_price x quantity |

All snapshot fields are immutable. They ensure the order record remains accurate even if the merchant later changes or deletes a product.

### 9.3 Order Lifecycle

```
                DRAFT (optional)
                     |
                     v
         PENDING_PAYMENT ----------> EXPIRED
                     |               (payment window closed, ~1 hour)
                     v
                   PAID
                     |
                     v
            PROCESSING -----------> CANCELLED
                     |              (merchant or buyer, stock restocked)
                     v
                  PACKED
                     |
                     v
                SHIPPED ----------> CANCELLED (not permitted)
                     |
                     v
                DELIVERED
                     |
                     v
                REFUNDED (future)
```

### 9.4 State Transitions Explained

| From | To | Trigger | Notes |
|---|---|---|---|
| — | `draft` | Checkout session created | Optional; used for complex or multi-step checkouts |
| `draft` | `pending_payment` | Buyer initiates payment | Payment reference issued |
| `pending_payment` | `paid` | Payment webhook confirms success | Inventory permanently decremented |
| `pending_payment` | `expired` | Payment window times out (~1 hour) | Reservations released |
| `paid` | `processing` | Merchant acknowledges order | Merchant dashboard action |
| `processing` | `packed` | Merchant marks as packed | Optional; signals readiness for dispatch |
| `packed` | `shipped` | Tracking info added or merchant marks dispatched | Triggers shipping notification to buyer |
| `shipped` | `delivered` | Confirmed delivery (manual or courier webhook) | Closes fulfilment loop |
| `paid` / `processing` / `packed` | `cancelled` | Merchant or buyer cancels | Stock restocked; refund initiated if paid |
| `delivered` | `refunded` | Refund request processed | Future feature |

**Invariant:** Once an order reaches `shipped`, it cannot be cancelled. Cancellation post-shipping requires a Return and Refund workflow (future).

### 9.5 OrderStatusEvent (Audit Log)

Every status transition is recorded as an immutable event.

| Field | Notes |
|---|---|
| `id` | UUID |
| `order_id` | FK to Order |
| `from_status` | Previous status |
| `to_status` | New status |
| `actor` | `merchant`, `customer`, `system`, `webhook` |
| `note` | Optional annotation |
| `created_at` | Timestamp |

---

## Section 10 — Payment Architecture

### 10.1 Provider Abstraction

The Payment module is designed around a provider interface, not a specific API. All provider-specific code lives in adapters that implement a common contract.

**Payment Provider Interface (conceptual):**

```
PaymentProvider contract:
  initiatePayment(params)  -> PaymentIntent (reference, redirect_url or account_details)
  verifyPayment(reference) -> VerificationResult (status, amount, currency)
  processWebhook(payload)  -> WebhookEvent (event_type, reference, status)
  initiateRefund(params)   -> RefundResult (future)
```

Supported providers plug into this interface via adapters:

- `PaystackAdapter` — implements PaymentProvider using Paystack's API
- `FlutterwaveAdapter` — implements PaymentProvider using Flutterwave's API
- Future: `StripeAdapter`, `ManualTransferAdapter` (for businesses accepting manual bank transfer confirmation)

The active provider is configured via `StoreSettings.payment_provider`. Switching providers requires no order domain changes — only a new adapter.

### 10.2 Payment Retry Model

A single order may have multiple payment attempts. A buyer may fail a first attempt, switch providers, or allow a virtual account to expire and generate a new one. The system must handle all of these without creating duplicate orders or double-charging.

The relationship is explicitly one-to-many:

```
Order
  ├── PaymentAttempt #1  (status: failed   — card declined)
  ├── PaymentAttempt #2  (status: expired  — virtual account not funded in time)
  └── PaymentAttempt #3  (status: success  — authoritative; triggers order state change)
```

**Rules governing payment attempts:**
- An order may have at most one attempt in `pending` status at any time
- A new attempt may only be initiated if no attempt is currently `pending`
- An order transitions to `paid` only when exactly one attempt reaches `success`
- A `success` attempt is immutable and cannot be superseded
- Failed and expired attempts are retained in the log for auditability

### 10.3 PaymentAttempt Entity

Each row represents one discrete payment initiation. Replaces the previous single `Payment` entity.

| Field | Notes |
|---|---|
| `id` | UUID |
| `order_id` | FK to Order — many attempts per order |
| `attempt_number` | Integer — sequential per order (1, 2, 3...) |
| `provider` | Enum: `paystack`, `flutterwave`, extensible |
| `provider_reference` | The external transaction ID from the provider (unique globally) |
| `idempotency_key` | Our internal key, unique per attempt — passed to provider |
| `amount` | Money integer in smallest unit |
| `currency` | ISO 4217 |
| `status` | Enum: `pending`, `success`, `failed`, `expired`, `refunded`, `partially_refunded` |
| `initiated_at` | Timestamp |
| `confirmed_at` | Timestamp nullable — set when status reaches `success` |
| `metadata` | JSONB — provider-specific data (virtual account details, redirect URLs, etc.) |

### 10.4 Virtual Accounts

For providers that support virtual account creation (Paystack, Flutterwave), the flow is:

1. A unique virtual account is generated per `PaymentAttempt`
2. The buyer is shown account details and transfers the exact amount
3. The provider detects the transfer and fires a webhook
4. The webhook triggers payment confirmation on that attempt

Virtual account details are stored in `PaymentAttempt.metadata` and are attempt-specific. If the attempt expires, a new attempt with a new virtual account is created. The previous expired attempt is retained in the log.

### 10.5 Webhook Processing

Webhooks from payment providers are the authoritative confirmation mechanism. The system follows this pattern:

1. Provider fires webhook to `/api/webhooks/payments/[provider]`
2. Webhook handler verifies the HMAC signature using the provider's secret key
3. The handler locates the matching `PaymentAttempt` using `provider_reference`
4. If valid, a `PaymentEvent` is written to the append-only log against that attempt
5. The handler emits an internal `payment.confirmed` or `payment.failed` domain event
6. The Order module listens and transitions the order accordingly
7. The Inventory module listens and permanently decrements stock
8. The Notifications module listens and dispatches buyer confirmation

**Idempotency:** Webhook events are de-duplicated using `provider_reference`. If a webhook for the same reference arrives twice, the second is logged but does not trigger further state changes.

### 10.6 PaymentEvent (Append-Only Log)

| Field | Notes |
|---|---|
| `id` | UUID |
| `payment_attempt_id` | FK to PaymentAttempt |
| `event_type` | Enum: `initiated`, `webhook_received`, `confirmed`, `failed`, `expired`, `refund_initiated`, `refunded` |
| `raw_payload` | JSONB — full webhook body for auditability |
| `created_at` | Timestamp |

---

## Section 11 — Shipping Architecture

### 11.1 Fulfilment Methods

The system models fulfilment at the conceptual level. The merchant configures which methods are available.

| Method | Description |
|---|---|
| `pickup` | Buyer collects from merchant's physical location |
| `local_delivery` | Merchant delivers within a defined local zone |
| `nationwide` | Third-party or in-house courier delivery across regions |

### 11.2 FulfilmentMethod Entity

| Field | Notes |
|---|---|
| `id` | UUID |
| `type` | Enum: `pickup`, `local_delivery`, `nationwide` |
| `name` | Display label: "Store Pickup", "Mainland Delivery", "GIG Courier" |
| `is_enabled` | Boolean |
| `estimated_days_min` | Minimum estimated delivery days |
| `estimated_days_max` | Maximum estimated delivery days |
| `instructions` | Optional merchant note to buyer (pickup address, cutoff times, etc.) |

### 11.3 ShippingZone Entity

A shipping zone groups geographic areas that share a rate structure.

| Field | Notes |
|---|---|
| `id` | UUID |
| `name` | e.g. "Lagos Island", "Southwest Nigeria", "Nationwide" |
| `regions` | Array of state or area strings |

### 11.4 ShippingRate Entity

| Field | Notes |
|---|---|
| `id` | UUID |
| `fulfilment_method_id` | FK to FulfilmentMethod |
| `zone_id` | FK to ShippingZone (nullable — null means global rate) |
| `rate_type` | Enum: `flat`, `weight_based`, `free` |
| `flat_amount` | Money for flat rate |
| `per_kg_amount` | Money for weight-based rate |
| `min_weight_kg` | Lower weight bound |
| `max_weight_kg` | Upper weight bound |
| `free_above_order_total` | Free shipping threshold Money nullable |

### 11.5 Rate Resolution

When the Checkout module calls the Shipping module for a rate:

1. Identify the buyer's delivery region
2. Find the applicable `ShippingZone` for that region
3. Find the applicable `ShippingRate` for the selected `FulfilmentMethod` + zone
4. Apply any free shipping threshold check
5. If rate is `weight_based`, compute total order weight from variant weights

If no rate is found for the buyer's zone, the merchant is notified and the checkout is blocked for that method.

---

## Section 12 — Customer Architecture

### 12.1 Guest vs Registered

The system supports both guest checkout (no account required) and registered customers (persistent identity and history). This is essential for social-commerce contexts where many buyers purchase once via Instagram and do not want friction.

### 12.2 Customer Entity (Registered)

| Field | Notes |
|---|---|
| `id` | UUID (matches Supabase Auth UID) |
| `auth_id` | FK to Supabase Auth user |
| `email` | Unique |
| `phone` | Optional |
| `first_name` | — |
| `last_name` | — |
| `avatar_url` | Optional |
| `status` | Enum: `active`, `blocked` |
| `created_at` | Timestamp |

### 12.3 GuestContact (Value Object)

Used for guest orders. Not persisted as a standalone entity — embedded within `Order`.

| Field | Notes |
|---|---|
| `name` | Full name |
| `email` | Required for email notifications |
| `phone` | Required for WhatsApp delivery updates |

### 12.4 CustomerAddress Entity

| Field | Notes |
|---|---|
| `id` | UUID |
| `customer_id` | FK to Customer |
| `label` | e.g. "Home", "Office" |
| `street_line_1` | — |
| `street_line_2` | Optional |
| `city` | — |
| `state` | — |
| `postal_code` | Optional |
| `country` | ISO 3166-1 alpha-2 |
| `is_default` | Boolean |

### 12.5 Order History

A registered customer's order history is retrieved by querying `Order` by `customer_id`. No separate "history" entity is needed — the Order module is the single source of truth. The Customer aggregate does not store order references; it queries the Order module at runtime.

### 12.6 Future Loyalty

A `LoyaltyAccount` entity (future) will extend the Customer aggregate, tracking points earned per order and redemptions. The domain model leaves this extension point explicit by keeping the Customer entity clean of any loyalty-specific fields in the initial version.

---

## Section 13 — Search and Discovery

### 13.1 Discovery Surfaces

The storefront exposes several discovery mechanisms:

| Surface | Mechanism |
|---|---|
| **Home / Featured** | Products flagged `is_featured = true` |
| **Category Browse** | Hierarchical category navigation |
| **Collection Pages** | Curated merchant-defined collections |
| **Tag Filtering** | Faceted tag-based filtering |
| **Search** | Full-text search across product name, description, tags |
| **Related Products** | Algorithmically or manually linked products |

### 13.2 Search Indexing

The Catalog module maintains a denormalised search index. Every write to `Product` (create, update, archive) triggers an async re-index of the affected product.

The search index document per product includes:

- Product name and description
- Category name and slug
- Collection names
- Tag labels
- SKU (for merchant internal search)
- Status (only `active` products are indexed)

MVP implementation: full-text search via Postgres `tsvector` (Supabase built-in). Future upgrade path: Algolia or Typesense adapter when search volume justifies the operational cost.

### 13.3 Related Products

In the MVP, related products are determined by shared category and tags. A `related_products` query returns the top N active products in the same category, excluding the current product. Future: explicit merchant curation via a `ProductRelation` join entity.

---

## Section 14 — Media Architecture

### 14.1 ProductImage Entity

| Field | Notes |
|---|---|
| `id` | UUID |
| `product_id` | FK to Product |
| `url` | Stored object URL (Supabase Storage) |
| `alt_text` | Accessibility + SEO description — mandatory |
| `display_order` | Integer — controls gallery sequence |
| `is_primary` | Boolean — the default display image |
| `width` | Pixel width (for layout hints, prevents cumulative layout shift) |
| `height` | Pixel height |

### 14.2 Variant Image Association

A `ProductVariant` has an optional `image_id` reference pointing to a `ProductImage`. When a buyer selects a variant with a linked image, the storefront swaps the gallery to show that variant's image as primary. If the variant has no specific image, the product's primary image is shown.

### 14.3 Storage Strategy

Images are stored in Supabase Storage. The upload pipeline:

1. Merchant uploads a raw image via the dashboard
2. The image is written to the Supabase Storage bucket with a structured path: `products/{product_id}/{uuid}.{ext}`
3. The public CDN URL is stored in `ProductImage.url`
4. Next.js Image component handles client-side optimisation (format conversion, resizing) via its built-in image optimisation pipeline

### 14.4 Future Video Support

A `ProductVideo` entity (future) will extend the media model. Videos will be stored with provider-agnostic URL references — either a direct Supabase Storage URL for short clips or an external provider URL (YouTube, Vimeo). The `Product` entity is designed to allow a `media` collection that can include both images and videos without schema changes.

### 14.5 Optimisation Strategy

- Supabase Storage serves images via a CDN edge
- Next.js Image component handles automatic `srcset` generation, lazy loading, and format negotiation (WebP/AVIF)
- `ProductImage.width` and `ProductImage.height` enable layout-stable image rendering (no cumulative layout shift)
- `alt_text` is mandatory for all uploaded images to satisfy WCAG AA requirements (as established in the UI Foundation)

---

## Section 15 — Entity Relationship Overview

The following is a text-based relationship diagram. All relationships are logical. Implementation uses foreign keys, not object embedding, except where explicitly noted as embedded (value objects).

```
STORE CONFIGURATION
  BrandProfile (singleton)
    name, logo_url, cover_image_url, brand_colours
    contact_email, contact_phone, social_links
    seo_title, seo_description, og_image_url
  StoreSettings (singleton)
    currency, tax_mode, active_payment_provider
    default_fulfilment_method_id, checkout_flow_options
  FeatureFlag (many)

CATALOG
  Category (self-referencing via parent_id)
    archived_at [nullable — soft delete]
    Product (many per category)
      status            [draft | active | archived]
      visibility        [public | hidden | scheduled]
      published_at      [nullable — for scheduled]
      archived_at       [nullable — soft delete]
      ProductSEO        [embedded value object, 1-to-1]
      base_price        [Money value object on Product]
      compare_at_price  [Money value object on Product, nullable]
      sale_price        [Money value object on Product, nullable]
      ProductImage      [1-to-many, ordered by display_order]
      OptionGroup       [1-to-many, 0 or more per product]
        OptionValue     [1-to-many per group]
      Tag               [many-to-many via ProductTag join]
      Collection        [many-to-many via CollectionProduct join]
      ProductVariant    [1-to-many, at least 1 per product]
        archived_at         [nullable — soft delete]
        option_combination  [JSONB: group_id -> value_id map]
        price_override      [Money, nullable]
        image_id            [FK to ProductImage, nullable]
        InventoryRecord     [1-to-1, owned by Inventory context]
          allow_backorders                  [boolean]
          continue_selling_when_out_of_stock [boolean]
          StockMovement     [1-to-many, append-only]

CUSTOMER
  Customer
    CustomerAddress [1-to-many]
    [Order history queried from Order by customer_id]

CART
  Cart
    customer_id [FK to Customer, nullable]
    CartLine [1-to-many]
      variant_id [FK to ProductVariant]

CHECKOUT
  CheckoutSession [transient, short-lived]
    cart_id              [FK to Cart]
    customer_id          [FK to Customer, nullable]
    guest_contact        [embedded value object]
    shipping_address     [embedded Address value object]
    fulfilment_method_id [FK to FulfilmentMethod]

ORDER
  Order
    customer_id              [FK to Customer, nullable]
    guest_contact            [embedded value object]
    shipping_address         [embedded Address snapshot]
    billing_address          [embedded Address snapshot]
    shipping_method_snapshot [immutable embedded snapshot]
    shipping_rate_snapshot   [immutable embedded snapshot]
    OrderLine [1-to-many]
      variant_id              [FK to ProductVariant, for reference]
      product_name_snapshot   [immutable string]
      variant_label_snapshot  [immutable string]
      sku_snapshot            [immutable string]
      image_url_snapshot      [immutable string]
      unit_price_snapshot     [immutable Money]
    OrderStatusEvent [1-to-many, append-only]
    OrderNote [1-to-many]

PAYMENT
  PaymentAttempt [1-to-many per Order — explicit retry model]
    order_id         [FK to Order]
    attempt_number   [sequential integer per order]
    provider_reference [unique globally]
    idempotency_key  [unique per attempt]
    status           [pending | success | failed | expired | refunded]
    PaymentEvent [1-to-many per attempt, append-only]

SHIPPING
  FulfilmentMethod
    ShippingRate [1-to-many]
      zone_id [FK to ShippingZone, nullable]
  ShippingZone
    regions [array of strings]

PROMOTIONS (future — evaluated via Pricing Pipeline stage 2)
  Promotion
    PromotionRule [1-to-many]
    CouponCode [1-to-many]

NOTIFICATIONS
  NotificationTemplate [one per event type]
  NotificationLog
    order_id or customer_id [FK, context-dependent]

MEDIA
  ProductImage [owned by Catalog, described above]
  ProductVideo [future]
```

---

## Section 16 — Folder Ownership

The `features/` directory owns all domain-specific application code. Each folder is a self-contained vertical slice implementing one bounded context. Infrastructure (Supabase client, fetch utilities, formatting) lives in `lib/` and `services/`.

```
features/
  catalog/
    components/     Product cards, galleries, option selectors, badge
    hooks/          useProduct, useProducts, useCategory, useCollection
    services/       catalog.service.ts
    types/          Product, ProductVariant, Category, Collection, Tag, OptionGroup

  inventory/
    hooks/          useInventory, useStockStatus
    services/       inventory.service.ts
    types/          InventoryRecord, StockMovement

  cart/
    components/     CartDrawer, CartLine, CartSummary, CartEmpty
    hooks/          useCart
    services/       cart.service.ts
    store/          cart.store.ts (Zustand client-side state)
    types/          Cart, CartLine

  checkout/
    components/     CheckoutSteps, ContactForm, AddressForm, ShippingSelector, PaymentSelector
    hooks/          useCheckout
    services/       checkout.service.ts
    types/          CheckoutSession

  orders/
    components/     OrderCard, OrderStatusBadge, OrderTimeline, OrderLineItem
    hooks/          useOrder, useOrderHistory
    services/       orders.service.ts
    types/          Order, OrderLine, OrderStatusEvent

  payments/
    adapters/       paystack.adapter.ts, flutterwave.adapter.ts
    hooks/          usePayment
    services/       payments.service.ts
    types/          Payment, PaymentEvent, PaymentProvider interface

  shipping/
    hooks/          useShippingRates, useFulfilmentMethods
    services/       shipping.service.ts
    types/          FulfilmentMethod, ShippingZone, ShippingRate

  customers/
    components/     AddressBook, ProfileForm, OrderHistoryList
    hooks/          useCustomer, useAddresses
    services/       customers.service.ts
    types/          Customer, CustomerAddress

  search/
    components/     SearchBar, SearchResults, FilterPanel, TagFilter
    hooks/          useSearch, useFilters
    services/       search.service.ts
    types/          SearchQuery, SearchResult, SearchFilter

  promotions/       (future - scaffolded, not implemented in MVP)
    types/          Promotion, PromotionRule, CouponCode

  store-config/
    hooks/          useStoreSettings, useBrandProfile, useFeatureFlag
    services/       store-config.service.ts
    types/          BrandProfile, StoreSettings, FeatureFlag

app/
  (storefront)/
    page.tsx                          Home — featured products
    products/
      page.tsx                        Product listing and search
      [slug]/page.tsx                 Product detail
    categories/[slug]/page.tsx
    collections/[slug]/page.tsx
    cart/page.tsx
    checkout/page.tsx
    orders/[id]/page.tsx              Order confirmation and tracking

  (dashboard)/                        Merchant admin (future)
    products/
    orders/
    inventory/
    settings/

  api/
    webhooks/payments/[provider]/     Webhook receivers per provider
    cart/
    checkout/
    orders/
```

---

## Section 17 — Future Expansion

### 17.1 Marketplace (Multi-Merchant)

The current model is single-merchant. Every entity that is currently implicitly merchant-scoped must be made explicitly tenant-scoped.

Required changes:
- Add `store_id` FK to `Product`, `Order`, `FulfilmentMethod`, `ShippingZone`
- Add a `Store` entity (separate from the current `StoreProfile` singleton)
- Introduce a `Seller` role extending the current authentication model with merchant permissions
- Order routing becomes `Order -> Store` rather than the implicit global context

The domain model supports this because entity relationships are maintained through explicit IDs. Adding `store_id` is an additive migration — not a destructive redesign.

### 17.2 Multiple Warehouses / Locations

The `InventoryRecord` currently assumes one location. To support multiple warehouses:

- Add a `Location` entity (warehouse, store front, third-party depot)
- Split `InventoryRecord` into `LocationInventory` (one record per variant per location)
- Introduce fulfilment routing logic that selects the best location for each order line

The `StockMovement` append-only log already captures the data needed. Only `location_id` needs to be added to movements.

### 17.3 Subscriptions

Subscriptions are a variant of the Order lifecycle where a successful order triggers a recurring payment schedule.

- Add a `SubscriptionPlan` entity linked to a product variant
- Add a `Subscription` entity tracking the current period, next billing date, and status
- `Subscription` generates `Order` records on each cycle using the same checkout orchestration

The `ProductVariant` and `OptionGroup` models already support "Subscription Duration" as an option dimension (Monthly, Quarterly, Annual). No structural changes to the variant, order, or fulfilment entities are required.

### 17.4 Gift Cards

Gift cards are variants with `product_type = gift_card`. They require:

- A `GiftCard` entity tracking the card code, original value, remaining balance, and expiry
- A `GiftCardRedemption` join entity recording partial or full usage against an `Order`
- A checkout totals adjustment that applies gift card balance before charging any remainder to a payment provider

### 17.5 Coupons and Promotions

The Promotions module is already modelled (Section 2.9) and included in the folder structure (Section 16). Activating it in a future release requires implementing the `Promotion` and `PromotionRule` entities and wiring the Checkout orchestration to call the Promotions service. No structural changes to Order, Cart, or Variant are required.

### 17.6 Bundles

A bundle is a product whose variant contains multiple underlying SKUs.

- Add a `BundleComponent` join entity: `bundle_variant_id` to `[component_variant_id, quantity]`
- The Checkout module, when processing a bundle line, decomposes it into component inventory reservations
- Order history displays the bundle as a single line to the buyer, but inventory is deducted at the component level

Current variant and inventory structures support this without schema redesign — only the bundle decomposition logic is new.

### 17.7 POS (Point of Sale)

A POS mode is the dashboard-side creation of an `Order` on behalf of a walk-in buyer.

- Add an `origin` enum to `Order` with values: `storefront`, `dashboard_pos`, `api`
- Add a `cash` or `pos_terminal` adapter implementing the `PaymentProvider` interface, returning immediate confirmation
- The existing checkout orchestration is reused; the UI surface differs, not the domain

### 17.8 Analytics

The domain model is analytics-ready because every meaningful event is already logged:

- `OrderStatusEvent` — full audit log of every lifecycle transition
- `StockMovement` — full audit log of every inventory change
- `PaymentEvent` — full log of every payment interaction
- All entities carry `created_at` and `updated_at` timestamps

Analytics are implemented as read models (separate queries or materialised views) over existing tables. No changes to the write domain are required. Metrics such as revenue per period, conversion rate, best-selling variants, and stock turnover are all derivable from the existing event logs.

---

## Architecture Decision Record

| Decision | Rationale |
|---|---|
| Variants are the purchasable atom, not Products | Products are a presentation concern; only variants carry price, inventory, and SKU. This applies to every business vertical without exception. |
| Option groups and values instead of fixed columns | Allows any configurable dimension without schema changes. A perfume by volume, a phone by storage, and a dress by size all use the same structural model. |
| All monetary values stored as integers in smallest currency unit | Eliminates floating-point arithmetic errors in financial calculations. Aligns with the existing `localizationConfig` in the engineering foundation. |
| Snapshots in OrderLine | Decouples order history from live catalog changes. A product name or price change never retroactively alters an existing order record. |
| Shipping method and rate also snapshotted on Order | Extends the same immutability principle to fulfilment data. Historical orders remain accurate even if the merchant restructures shipping zones or renames methods. |
| Payment provider interface and adapter pattern | Decouples the order domain from any specific payment API. Adding a new provider requires only a new adapter — no changes to the order model or checkout orchestration. |
| One-to-many Order to PaymentAttempt | A buyer may fail, abandon, or switch providers before succeeding. Modelling each attempt separately prevents data loss, enables retry flows, and ensures exactly one `success` attempt per order without ambiguity. |
| Append-only event logs for inventory, orders, and payments | Provides full auditability, debugging capability, and the raw data for analytics without additional instrumentation. Immutable logs are also resilient to accidental data mutation. |
| Cart totals computed on read, not stored | Prevents stale totals. The cart total is always computed from current variant prices, ensuring accuracy even if prices change mid-session. |
| Guest checkout as first-class, not an afterthought | Social-commerce buyers frequently purchase without registering. Forcing registration at checkout is a significant conversion friction point in the target market. |
| Single currency in MVP, extensible later | Simplifies the pricing model significantly. Multi-currency can be layered on later via a display-conversion service without touching stored prices. |
| Vertical slice feature architecture under features/ | Each bounded context owns its own components, hooks, services, and types. This enables independent development, testing, and future team ownership without cross-feature coupling. |
| Stock reservation separate from permanent decrement | Prevents overselling during the checkout window while remaining accurate. The two-step model (reserve on checkout start, decrement on payment) is the industry standard for transactional stock management. |
| Address stored as snapshot on Order | Decouples order fulfilment data from future customer address book changes. A buyer can update their saved address without affecting any historical order record. |
| BrandProfile separated from StoreSettings | Branding (name, logo, colours, SEO) changes at a different cadence and for different reasons than operational settings (currency, payment provider, tax mode). Keeping them separate prevents coupling and cleanly supports future white-labelling. |
| Soft deletes via archived_at on Product, Variant, Category | Hard deletion breaks foreign key references in historical orders. Archiving preserves referential integrity while removing the entity from all discovery surfaces. |
| Product visibility separate from product status | Status controls operational state (can it be purchased?). Visibility controls storefront exposure (can it be seen?). Separating them enables scheduled launches, hidden exclusive drops, and preview links without changing purchasability. |
| Inventory policies (allow_backorders) on InventoryRecord | Different merchants have different tolerance for zero-stock situations. A bakery may never want to oversell; a fashion brand may accept backorders for made-to-order items. The policy field makes this merchant-configurable without code changes. |
| Promotions evaluated exclusively through the Pricing Pipeline | Centralising all price modifications in a single ordered pipeline prevents discount logic from leaking into Checkout, Cart, or Order code. Any future promotion type plugs into stage 2 of the pipeline automatically. |

---

*End of Commerce Domain Architecture — Step 3*

*Next: Step 4 — Supabase Database Design*
*This domain model translates directly into SQL tables, constraints, and Row Level Security policies.*
