# Sivvai Labs Commerce Kit — Deep Audit

## 1. Executive Summary

The **Sivvai Labs Commerce Kit** is a single-merchant, self-hosted e-commerce application template built with Next.js 16 (App Router), TypeScript, Tailwind CSS, and Supabase (PostgreSQL + RLS + Auth + Storage). 

Following recent phased feature additions (security hardening, admin backend RBAC, catalog FTS, and storage integration), the codebase has accumulated architectural drift, broken Next.js 16 API calls, conflicting guest cookie schemes, duplicated domain abstractions, and non-transactional commerce operations.

### Key Audit Conclusions:
1. **Broken Core Feature (Publish Button):** The product publish button fails due to a breaking signature change in Next.js 16. `revalidateTag` in Next.js 16 requires two arguments (`tag` and `profile`), but 34 locations across `features/admin/actions/admin.actions.ts` call `revalidateTag` with only 1 argument (`revalidateTag("catalog")`). This throws a runtime `TypeError` inside every admin server action, causing `publishProductAction`, `createProductAction`, `updateProductAction`, `archiveProductAction`, etc., to catch the error and return `{ success: false }`. In addition, UI components (`ProductsTable.tsx`) swallow errors silently, leaving the user with no visual feedback.
2. **Cookie & Guest Ownership Conflict:** Two opposing cookie strategies exist simultaneously:
   - `proxy.ts` and `lib/auth/cart-token.ts` manage `cart_token` (a random UUID hashed via SHA-256 for DB lookup).
   - `features/storefront/actions/cart.actions.ts` manages `cart_id` (storing the raw DB cart UUID directly in the client cookie).
   This disparity breaks guest cart RLS boundary checks and creates fragmented cart sessions.
3. **Non-Transactional Commerce Engine:** `createOrderFromCheckout` in `services/order-service.ts` performs 7 sequential network calls outside of a database transaction boundary. A network hiccup or server crash mid-flight leaves orders inserted with un-cleared carts, un-updated checkout sessions, or un-deducted inventory.
4. **Hardcoded & Zero-Amount Payments:** `initiatePayment` in `services/payment-service.ts` initializes transactions with `amount: 0` and `email: "customer@store.com"` hardcoded, making all payment initializations broken in real-world gateway calls.
5. **Over-Engineered Layering:** Operations cascade through `UI → Client Hook → Server Action → Service → Repository → Supabase`. Many service methods (e.g., `shipping-service.ts`, `promotion-service.ts`, `store-service.ts`) are 5-line pass-through wrappers that re-export repository calls without adding domain rules.

---

## 2. Current Architecture

### 2.1 File Map & Directory Structure
```text
app/
  (commerce)/               # Cart & Checkout UI flows
  (storefront)/             # Public catalog, category, product detail, home pages
  admin/
    (protected)/            # Protected admin pages (products, categories, orders, customers, settings)
    login/                  # Admin auth routes
  api/
    cart/, categories/, checkout/, health/, orders/, products/, shipping/, webhooks/ (paystack, flutterwave)
components/
  admin/                    # Admin UI components (tables, modals, badges, header, sidebar)
  shared/                   # Currency, price, loading UI
  storefront/               # Product cards, hero, navigation, footer, cart drawer
features/
  admin/
    actions/                # admin.actions.ts (865 lines — monolithic server actions)
    hooks/                  # useAdmin.ts (execution wrapper)
  storefront/
    actions/                # cart.actions.ts, checkout.actions.ts, account.actions.ts
    hooks/                  # useCart.ts
    store/                  # cartStore.ts (Zustand)
lib/
  auth/                     # admin-guard.ts, server-auth.ts, cart-token.ts
  db/                       # Repositories (products.ts, carts.ts, checkout.ts, orders.ts, etc.)
  payments/                 # Paystack, Flutterwave providers & factory
  supabase/                 # server.ts (createServerClient, createPublicClient), admin.ts (createAdminClient), proxy.ts
  validation/               # Zod schemas (admin.ts, products.ts, checkout.ts, etc.)
services/                   # Domain services (product-service, cart-service, order-service, payment-service, etc.)
supabase/
  migrations/               # 29 SQL migrations (001_extensions through 029_admin_option_groups_select_policy)
```

### 2.2 Layering Architecture
```text
[ Browser Client ]
       │ (HTTP / Server Actions)
       ▼
[ Next.js Request Proxy (proxy.ts) ] ── (Session Refresh & /admin Redirect)
       │
       ▼
[ Server Actions / Route Handlers ]
       │ ── Permission Check (requirePermission)
       │ ── Input Validation (Zod)
       ▼
[ Services (services/*.ts) ]
       │ ── Business Orchestration
       ▼
[ Repositories (lib/db/*.ts) ]
       │ ── Database Access (createClient() or createAdminClient())
       ▼
[ Supabase / PostgreSQL Database ] ── (RLS & RPCs)
```

---

## 3. Critical Findings

1. **Next.js 16 API Mismatch (`revalidateTag`):** Next.js 16 requires `revalidateTag(tag: string, profile: string | CacheLifeConfig)`. Calling `revalidateTag("catalog")` throws `TypeError: Expected 2 arguments, but got 1`.
2. **Duplicate & Conflicting Cookie Keys:** `cart_token` (in `proxy.ts` / `cart-token.ts`) vs `cart_id` (in `cart.actions.ts`).
3. **Hardcoded Payment Parameters:** `amount: 0` and `email: "customer@store.com"` in `payment-service.ts`.
4. **Non-Transactional Order Creation:** 7 sequential mutations in `order-service.ts` without PL/pgSQL RPC transaction protection.
5. **Silent UI Error Swallowing:** `useAdmin()` catches action errors, but `ProductsTable.tsx` does not render `error` state.
6. **Bypassed / Duplicated API Layer:** Both REST API Route Handlers (`app/api/cart`, `app/api/products`) AND Server Actions (`features/storefront/actions/cart.actions.ts`, `features/admin/actions/admin.actions.ts`) exist for identical mutations.
7. **Monolithic Admin Actions File:** `features/admin/actions/admin.actions.ts` is 865 lines long and handles 7 different domain areas in a single file.

---

## 4. Publish Button Root Cause

### 4.1 Root Cause Summary
The Publish button fails due to a **Next.js 16 breaking API signature change**. In Next.js 16.2.10 (`node_modules/next/dist/server/web/spec-extension/revalidate.d.ts`), `revalidateTag` is defined as:
```ts
export declare function revalidateTag(tag: string, profile: string | CacheLifeConfig): undefined;
```
In `features/admin/actions/admin.actions.ts`, lines 204–205:
```ts
export async function publishProductAction(id: string) {
  try {
    await requirePermission("manage_products");
    const published = await productService.publishProduct(id);

    await logAuditEvent({ ... });

    revalidateTag("catalog"); // ❌ FAILS: Expected 2 arguments, got 1
    revalidateTag("default"); // ❌ FAILS: Expected 2 arguments, got 1
    revalidatePath("/", "layout");
    revalidatePath("/admin/products");
    return { success: true, product: published };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to publish product",
    };
  }
}
```

### 4.2 Failure Trace
```text
User clicks "Publish Product" in PublishProductModal
   ↓
Modal calls handlePublishModal() in EditProductForm.tsx
   ↓
Calls updateProductAction()  ──> Throws in revalidateTag("catalog") ──> Returns { success: false }
   ↓
Calls publishProductAction() ──> Throws in revalidateTag("catalog") ──> Returns { success: false }
   ↓
EditProductForm sets feedback status to "error" ("Publish Failed")
```
In `ProductsTable.tsx`:
```text
User clicks "Checkmark" (Publish) button
   ↓
handlePublish(id) calls execute(() => publishProductAction(id))
   ↓
Action returns { success: false, error: "Expected 2 arguments, but got 1" }
   ↓
useAdmin() sets error state, but ProductsTable DOES NOT RENDER the error state!
   ↓
UI remains silent and product stays in "draft" status in UI view.
```

### 4.3 Recommended Fix (Do Not Implement Yet)
Replace single-argument `revalidateTag("catalog")` with `revalidateTag("catalog", "default")` (or `updateTag("catalog")`) across all admin actions, and update `ProductsTable.tsx` to display error toasts/banners on action failure.

---

## 5. Product System Audit

### 5.1 Product Lifecycle Trace
```text
Admin creates product (createProductAction)
        ↓
Inserts row in `products` table
        ↓
Creates default variant in `product_variants`
        ↓
Creates initial `inventory_records` row
        ↓
Admin uploads image (generateProductImageUploadUrlAction + addProductImageAction)
        ↓
Images saved to `product_images` bucket & DB table
        ↓
Admin edits product (updateProductAction)
        ↓
Admin clicks Publish (publishProductAction)
        ↓
Status set to 'published' + published_at timestamped
        ↓
revalidateTag("catalog", "default") + revalidatePath()
        ↓
Public catalog query (findProducts) filters status='published'
```

### 5.2 Duplication & Canonical Path
- Currently, product status can be mutated via:
  1. `updateProductAction` (passing status in payload)
  2. `publishProductAction`
  3. `unpublishProductAction`
  4. `archiveProductAction`
  5. `restoreProductAction`
- **Recommendation:** Keep typed server actions for explicit lifecycle state changes (`publish`, `unpublish`, `archive`, `restore`) but route all internal updates to `productService.updateProductStatus(id, status)`.

---

## 6. Product Image System Audit

### 6.1 Lifecycle
```text
Select File ──> WebP Compression in Browser (compressImageInBrowser)
            ──> Server Action (generateProductImageUploadUrlAction)
            ──> Direct Storage Upload (PUT to signed URL in product-images bucket)
            ──> Server Action (addProductImageAction)
            ──> DB record in `product_images`
```

### 6.2 Findings
- Bucket `product-images` uses public read on public paths and signed upload URLs for admins.
- In-browser WebP compression reduces payload before upload.
- **Issue:** Deleting a product image record from `product_images` table (`removeProductImageAction`) does NOT delete the physical file object from Supabase Storage bucket, creating orphaned files.

---

## 7. Database Schema Audit

| Table | Purpose | Keys & Constraints | RLS Status | Issues / Findings |
| ----- | ------- | ------------------ | ---------- | ----------------- |
| `products` | Core product metadata | PK `id`, Unique `slug` | Enabled | `cost_price` is not on table; derived in UI. |
| `product_variants` | Product variants & SKUs | PK `id`, FK `product_id` | Enabled | Clean. |
| `product_images` | Image URLs & ordering | PK `id`, FK `product_id` | Enabled | Missing cascade file cleanup. |
| `categories` | Category tree | PK `id`, Unique `slug` | Enabled | Clean. |
| `carts` | Shopping carts | PK `id`, FK `customer_id` | Enabled | Uses `cart_token_hash`. Clean. |
| `cart_lines` | Items in cart | PK `id`, FK `cart_id`, `variant_id` | Enabled | Clean. |
| `checkout_sessions` | Locked checkout state | PK `id`, FK `cart_id`, `customer_id` | Enabled | Missing locked total columns (`subtotal`, `grand_total`). |
| `orders` | Completed orders | PK `id`, Unique `order_number` | Enabled | Created directly at `status = 'completed'`. Missing proper state machine (`pending` → `paid` → `fulfilled`). |
| `order_lines` | Items in order | PK `id`, FK `order_id` | Enabled | Clean. |
| `admin_users` | Admin accounts | PK `id`, FK `auth_user_id` | Enabled | Hardened with owner lockout guard. |
| `roles` & `permissions` | RBAC setup | PK `id`, Unique `key` | Enabled | Clean. |
| `audit_logs` | Audit trail | PK `id`, FK `admin_user_id` | Enabled | Can swallow null `admin_user_id`. Needs enforcement. |

---

## 8. Migration Audit

Timeline of 29 migrations:
- `001_extensions.sql` – `018_grant_service_role.sql`: Foundation schema, catalog, cart, orders, initial RLS, and grants.
- `019_admin_auth.sql` – `022_team_invitations.sql`: Admin RBAC system and owner safeguards.
- `023_cart_token.sql`: Added `cart_token_hash` to `carts`.
- `024_private_schema.sql`: Moved `admin_has_permission` to `private` schema and updated policies.
- `025_checkout_rls.sql`: Hardened checkout session RLS.
- `026_storage_setup.sql`: Created `product-images` storage bucket policies.
- `027_catalog_fts.sql`: Full-text search `tsvector` index.
- `028_admin_catalog_write_grants.sql`: Fixed 403 error by granting write permissions on catalog tables to `authenticated`.
- `029_admin_option_groups_select_policy.sql`: Admin option group select policy.

**Strategy:** Do NOT modify applied historical migrations (001–029). Introduce new migrations starting at `030_...` for future fixes.

---

## 9. RLS & Permissions Audit

- **Data API Exposure:** `private.admin_has_permission` and `private.count_active_owners` reside in the unexposed `private` schema. `REVOKE EXECUTE ON PUBLIC, anon` is correctly applied.
- **Catalog Tables:** `products`, `categories`, `product_variants`, `product_images` have public `SELECT` for published items and `private.admin_has_permission('manage_products')` for mutations by `authenticated`.
- **Service-Role Bypass Audit:** Service-role client (`createAdminClient()`) is confined to admin actions, webhooks, and background jobs. Fallbacks in `lib/db/carts.ts` have been removed.

---

## 10. Authentication & Guest Cart Audit

- **Cookie Conflict:**
  - `proxy.ts` sets HttpOnly cookie `cart_token` (UUID).
  - `cart.actions.ts` sets HttpOnly cookie `cart_id` (raw cart UUID).
- **Security Vulnerability:** Storing raw `cart_id` in client cookies allows cart manipulation if cookie is forged. The canonical approach must be: Client stores `cart_token`; Server computes `SHA-256(cart_token)` → `cart_token_hash` for DB lookup.

---

## 11. Admin System Audit

- **RBAC Guarding:** Admin Server Actions call `requirePermission("manage_x")` at the entry boundary.
- **Audit Logging:** `logAuditEvent` writes to `audit_logs`.
- **Owner Lockout Guard:** `private.count_active_owners()` ensures the last active owner cannot be deactivated or demoted.

---

## 12. API & Server Actions Audit

- **Redundancy:** Both REST API routes (`app/api/cart/route.ts`, `app/api/products/route.ts`) and Server Actions (`cart.actions.ts`, `admin.actions.ts`) exist.
- **Recommendation:**
  - Storefront UI & Admin UI: Use **Server Actions** exclusively.
  - External integrations & Webhooks: Use **Route Handlers** (`app/api/webhooks/*`, `/api/health`).
  - Deprecate/remove redundant internal REST routes (`app/api/cart`, `app/api/products`, `app/api/categories`).

---

## 13. Duplicate Requests & Duplicate Logic

- `EditProductForm.tsx` makes two consecutive Server Action calls on Publish: `updateProductAction` followed by `publishProductAction`, fetching and updating the product twice in one user interaction.
- `useAdmin()` calls `router.refresh()`, triggering a full RSC tree re-fetch even after server actions already perform `revalidatePath()`.

---

## 14. Service / Repository Architecture Audit

- Service layer currently contains several thin wrapper services (`shipping-service.ts`, `store-service.ts`, `promotion-service.ts`) that merely re-export repository functions.
- **Target Clean Architecture:**
  - `lib/db/*`: Data access & SQL queries only.
  - `services/*`: Real business logic & multi-step orchestration (Cart merging, Checkout, Order processing, Payments). Thin wrappers merged directly into domain modules.
  - `features/*/actions`: Boundary validation (Zod), RBAC checking, and revalidation calls.

---

## 15. Cart System Audit

- Guest carts use `cart_token_hash`.
- Prices are calculated server-side from `product_variants.price_override ?? products.base_price`. Client cannot override unit prices.
- Merge on login transfers guest cart line items to customer cart upon authentication.

---

## 16. Checkout System Audit

- `initiateCheckout` in `services/checkout-service.ts` creates a `checkout_sessions` record and reserves inventory.
- **Gap:** `checkout_sessions` does not persist calculated `subtotal`, `shipping_total`, `discount_total`, `grand_total` in DB columns; totals are computed transiently in memory.

---

## 17. Orders & Inventory Audit

- Inventory reservation uses 15-minute expiration window.
- `createOrderFromCheckout` is not transactional across SQL boundaries.
- **Remediation Plan:** Move order creation into a single atomic Postgres RPC `create_order_from_checkout(checkout_session_id, payment_ref)`.

---

## 18. Payment System Audit

- `PaystackProvider` and `FlutterwaveProvider` implement HMAC-SHA512 and `verif-hash` cryptographic signature verification.
- Critical bug in `services/payment-service.ts`: `initiatePayment` passes `amount: 0` and `email: "customer@store.com"`. Must be replaced with real locked checkout totals and customer email.

---

## 19. Shipping System Audit

- Shipping rates calculated via `calculateShippingRate` in `lib/db/shipping.ts`.
- Shipping zone matching matches user state/region against `shipping_zones` and `shipping_rates`.

---

## 20. Cache & Revalidation Audit

- Next.js 16 signature error on `revalidateTag`.
- Over-revalidation: Calling `revalidatePath("/", "layout")` on minor item quantity updates purges the entire application cache.

---

## 21. Error Handling Audit

- Structured error responses: `{ success: false, error: string }`.
- Swallowed errors in `ProductsTable.tsx` UI visual layer.

---

## 22. Configuration & Secrets Audit

- `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` is properly guarded with `import "server-only"`.

---

## 23. Dependency Audit

| Package | Version | Recommendation | Reason |
| ------- | ------- | -------------- | ------ |
| `next` | 16.2.10 | **KEEP** | Core framework. |
| `react` | 19.2.4 | **KEEP** | React 19. |
| `@supabase/ssr` | ^0.12.3 | **KEEP** | Official Supabase SSR client. |
| `@supabase/supabase-js` | ^2.110.8 | **KEEP** | Supabase SDK. |
| `zod` | ^4.4.3 | **KEEP** | Validation. |
| `zustand` | ^5.0.14 | **KEEP** | Client cart drawer state. |

---

## 24. Code Complexity Audit

- `features/admin/actions/admin.actions.ts` (865 lines): Monolithic file covering all admin domains. Split into domain-specific action modules (`product.actions.ts`, `order.actions.ts`, `category.actions.ts`, etc.).

---

## 25. Target Architecture

```text
Storefront / Admin UI
        │
        ▼ (Server Actions)
Input Validation (Zod) + Permission Guard (requirePermission)
        │
        ▼
Domain Services (Cart, Checkout, Order, Payment)
        │
        ▼
PostgreSQL Database (RLS + Atomic RPCs: create_order_from_checkout)
```

---

## 26. KEEP / REMOVE / MERGE / REFACTOR Matrix

| Subsystem | Recommendation | Reason | Priority |
| --------- | -------------- | ------ | -------- |
| Admin Actions | **REFACTOR** | Split 865-line file into domain action files; fix Next 16 `revalidateTag` signature. | P0 |
| Products Table UI | **REFACTOR** | Display error toasts/banners on action failure instead of swallowing. | P0 |
| Payment Initialization | **REFACTOR** | Replace `amount: 0` and dummy email with locked checkout totals. | P0 |
| Cart Cookies | **REFACTOR** | Consolidate `cart_id` vs `cart_token` into single `cart_token` signed cookie. | P1 |
| Order Creation | **REWRITE** | Move 7-step JS creation into single atomic Postgres RPC `create_order_from_checkout`. | P1 |
| Internal REST API Routes | **REMOVE** | Remove redundant `/api/cart`, `/api/products` endpoints. | P2 |
| Thin Pass-Through Services | **MERGE** | Merge 5-line wrapper services into repo/action layers. | P2 |

---

## 27. Migration Cleanup Strategy

- Preserve migrations `001` through `029` untouched.
- Create new migrations (`030_checkout_totals.sql`, `031_create_order_rpc.sql`) for future structural additions.

---

## 28. Feature Health Matrix

| Feature | Exists | Works | Secure | Duplicated | Action Required |
| ------- | -----: | ----: | -----: | ---------: | --------------- |
| Admin Auth & RBAC | Yes | Yes | Yes | No | **KEEP** |
| Product Creation | Yes | Yes | Yes | No | **KEEP** |
| Product Publishing | Yes | **NO** | Yes | Yes | **REFACTOR (Fix Next 16 revalidateTag)** |
| Guest Cart | Yes | Partial | Yes | Yes | **REFACTOR (Fix cookie name disparity)** |
| Image Uploads | Yes | Yes | Yes | No | **KEEP** |
| Payment Webhooks | Yes | Yes | Yes | No | **KEEP** |
| Order Creation | Yes | Partial | Partial | No | **REWRITE (Make Transactional RPC)** |
| Payment Init | Yes | **NO** | Partial | No | **REFACTOR (Fix zero amount)** |

---

## 29. Prioritized Remediation Plan

### P0 — Critical Blockers
1. Fix Next.js 16 `revalidateTag` 2-argument signature across all admin server actions.
2. Render error feedback in `ProductsTable.tsx` when server actions fail.
3. Fix hardcoded `amount: 0` and dummy email in `payment-service.ts`.

### P1 — Core Correctness & Security
1. Unify guest cart cookie implementation on `cart_token`.
2. Convert `createOrderFromCheckout` into an atomic Postgres RPC.
3. Persist locked checkout totals in `checkout_sessions`.

### P2 — Code Simplification & Cleanup
1. Split `admin.actions.ts` into domain action files (`products.actions.ts`, `orders.actions.ts`, etc.).
2. Remove redundant internal REST API routes (`app/api/cart`, `app/api/products`).
3. Merge thin pass-through service wrappers.

---

## 30. Final Acceptance Criteria

1. **Publish Product:** Clicking "Publish" in UI correctly updates database status to `published`, triggers valid Next.js 16 tag revalidation (`revalidateTag("catalog", "default")`), and immediately updates storefront catalog view without errors.
2. **Type Check:** `npm run type-check` passes with zero errors.
3. **Cart Consistency:** Guest cart uses single `cart_token` cookie; guest cart ownership is enforced via `cart_token_hash` in DB.
4. **Transactional Orders:** Order creation runs inside an atomic Postgres RPC boundary; partial failures rollback cleanly.
5. **Real Payment Amounts:** Payment initializations send verified checkout session totals to Paystack/Flutterwave.

---

## 31. Recommended Implementation Sequence

```text
Phase 1: Fix Next.js 16 revalidateTag calls & Publish Button (P0)
   ↓
Phase 2: Fix Payment Amount & Email in payment-service.ts (P0)
   ↓
Phase 3: Consolidate Guest Cart Cookie (cart_token) & RLS Boundary (P1)
   ↓
Phase 4: Create Atomic Postgres Order Creation RPC (P1)
   ↓
Phase 5: Split Admin Actions & Remove Redundant REST API Routes (P2)
```
