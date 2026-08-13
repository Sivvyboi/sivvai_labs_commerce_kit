-- =============================================================================
-- 20260811181908_admin_catalog_write_grants.sql
-- Fix: Grant INSERT, UPDATE, DELETE on catalog tables to authenticated role.
--
-- Root cause of 403:
--   Migration 017_grants.sql granted only SELECT on catalog tables to the
--   `authenticated` role. PostgreSQL evaluates table-level privileges BEFORE
--   RLS policies. Without INSERT/UPDATE/DELETE privileges, Postgres rejects
--   the mutation with a permission-denied (403) error and never reaches the
--   `private.admin_has_permission()` RLS check.
--
-- Fix:
--   Grant write privileges to `authenticated` on all tables that have
--   admin write RLS policies. RLS remains the authoritative row-level
--   guard — only admins with the correct permission will pass it.
--
-- Security model preserved:
--   GRANT INSERT/UPDATE/DELETE  → allows the role to attempt the operation
--   RLS policy (USING/WITH CHECK calling private.admin_has_permission())
--                               → enforces that only a permissioned admin
--                                 can actually affect any row
--   private.admin_has_permission() is SECURITY DEFINER with fixed
--   search_path, lives in the unexposed private schema, and is not
--   callable via the Data API.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Catalog: products & sub-tables
-- (RLS write policy: private.admin_has_permission('manage_products'))
-- ---------------------------------------------------------------------------
GRANT INSERT, UPDATE, DELETE ON products         TO authenticated;
GRANT INSERT, UPDATE, DELETE ON product_images   TO authenticated;
GRANT INSERT, UPDATE, DELETE ON product_variants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON option_groups    TO authenticated;
GRANT INSERT, UPDATE, DELETE ON option_values    TO authenticated;

-- ---------------------------------------------------------------------------
-- Categories
-- (RLS write policy: private.admin_has_permission('manage_categories'))
-- ---------------------------------------------------------------------------
GRANT INSERT, UPDATE, DELETE ON categories TO authenticated;

-- ---------------------------------------------------------------------------
-- Inventory
-- (RLS write policy: private.admin_has_permission('manage_inventory'))
-- ---------------------------------------------------------------------------
GRANT INSERT, UPDATE, DELETE ON inventory_records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON stock_movements   TO authenticated;

-- ---------------------------------------------------------------------------
-- Promotions & sub-tables
-- (RLS write policy: private.admin_has_permission('manage_promotions'))
-- ---------------------------------------------------------------------------
GRANT INSERT, UPDATE, DELETE ON promotions       TO authenticated;
GRANT INSERT, UPDATE, DELETE ON promotion_rules  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON coupon_codes     TO authenticated;

-- ---------------------------------------------------------------------------
-- Store configuration
-- (RLS write policy: private.admin_has_permission('manage_settings'))
-- ---------------------------------------------------------------------------
GRANT INSERT, UPDATE, DELETE ON store_settings  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON brand_profile   TO authenticated;
GRANT INSERT, UPDATE, DELETE ON feature_flags   TO authenticated;

-- ---------------------------------------------------------------------------
-- Orders: admin write operations
-- (RLS write policies: manage_orders)
-- ---------------------------------------------------------------------------
GRANT UPDATE ON orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON order_status_events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON order_notes         TO authenticated;

-- ---------------------------------------------------------------------------
-- Customers: admin write operations
-- (RLS write policy: manage_customers)
-- ---------------------------------------------------------------------------
-- Note: UPDATE already granted in 017_grants.sql but we re-grant idempotently.
-- No INSERT/DELETE for customers from admin (customer creation is server-only).

-- ---------------------------------------------------------------------------
-- Admin users: self-service update (e.g. profile changes)
-- (RLS policy: own record OR manage_users)
-- ---------------------------------------------------------------------------
GRANT INSERT, UPDATE ON admin_users TO authenticated;
