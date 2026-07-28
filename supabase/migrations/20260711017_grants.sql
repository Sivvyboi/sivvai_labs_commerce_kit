-- =============================================================================
-- 017_grants.sql
-- Idempotent PostgreSQL privileges, schema usage, and schema adjustments.
-- Ensures Data API roles (anon, authenticated) have proper access to public tables
-- while maintaining least-privilege principles and RLS controls.
-- =============================================================================

-- 1. Schema Access
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Catalog & Store Config (Public Reads)
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT SELECT ON product_images TO anon, authenticated;
GRANT SELECT ON product_variants TO anon, authenticated;
GRANT SELECT ON option_groups TO anon, authenticated;
GRANT SELECT ON option_values TO anon, authenticated;
GRANT SELECT ON collections TO anon, authenticated;
GRANT SELECT ON tags TO anon, authenticated;
GRANT SELECT ON product_tags TO anon, authenticated;
GRANT SELECT ON collection_products TO anon, authenticated;
GRANT SELECT ON inventory_records TO anon, authenticated;
GRANT SELECT ON brand_profile TO anon, authenticated;
GRANT SELECT ON store_settings TO anon, authenticated;
GRANT SELECT ON feature_flags TO anon, authenticated;

-- 3. Shipping & Promotions (Public Reads)
GRANT SELECT ON fulfilment_methods TO anon, authenticated;
GRANT SELECT ON shipping_zones TO anon, authenticated;
GRANT SELECT ON shipping_rates TO anon, authenticated;
GRANT SELECT ON promotions TO anon, authenticated;
GRANT SELECT ON promotion_rules TO anon, authenticated;
GRANT SELECT ON coupon_codes TO anon, authenticated;

-- 4. Carts & Checkout Sessions (Public Mutations — controlled by RLS)
GRANT SELECT, INSERT, UPDATE ON carts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cart_lines TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON checkout_sessions TO anon, authenticated;

-- 5. Customer Domain (Authenticated Self-Service & Anon Cart RLS Evaluation)
GRANT SELECT ON customers TO anon;
GRANT SELECT, UPDATE ON customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_addresses TO authenticated;

-- 6. Orders & Payments (Authenticated Reads — Mutations handled by Service-Role Admin Client)
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_lines TO authenticated;
GRANT SELECT ON order_status_events TO authenticated;
GRANT SELECT ON order_notes TO authenticated;
GRANT SELECT ON payment_attempts TO authenticated;
GRANT SELECT ON payment_events TO authenticated;

-- 7. Sequence Privileges
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 8. Schema Alignment for Architecture B (Checkout Session → Payment Attempt → Order Created)
-- Allow payment_attempts.order_id to be nullable at initiation time before order creation
ALTER TABLE payment_attempts ALTER COLUMN order_id DROP NOT NULL;
