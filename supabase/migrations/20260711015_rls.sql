-- =============================================================================
-- 015_rls.sql
-- Enable Row Level Security (RLS) on all tables and define access policies.
-- Uses the 'TO' clause instead of deprecated 'auth.role() = ...'.
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE brand_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfilment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STORE CONFIGURATION POLICIES
-- =============================================================================

-- Brand Profile (Read-only to public)
CREATE POLICY "Allow public read of brand profile" ON brand_profile
    FOR SELECT TO public USING (true);

-- Store Settings (Read-only to public)
CREATE POLICY "Allow public read of store settings" ON store_settings
    FOR SELECT TO public USING (true);

-- Feature Flags (Read-only to public)
CREATE POLICY "Allow public read of feature flags" ON feature_flags
    FOR SELECT TO public USING (true);


-- =============================================================================
-- CATALOG POLICIES
-- =============================================================================

-- Categories (Read-only for active categories)
CREATE POLICY "Allow public read of active categories" ON categories
    FOR SELECT TO public USING (archived_at IS NULL);

-- Products (Read-only for active published products)
CREATE POLICY "Allow public read of active published products" ON products
    FOR SELECT TO public USING (status = 'published' AND visibility = 'public' AND archived_at IS NULL);

-- Product Images (Read-only if product is active/published)
CREATE POLICY "Allow public read of active product images" ON product_images
    FOR SELECT TO public USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_id
              AND products.status = 'published'
              AND products.visibility = 'public'
              AND products.archived_at IS NULL
        )
    );

-- Option Groups (Read-only if product is active/published)
CREATE POLICY "Allow public read of active option groups" ON option_groups
    FOR SELECT TO public USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_id
              AND products.status = 'published'
              AND products.visibility = 'public'
              AND products.archived_at IS NULL
        )
    );

-- Option Values (Read-only if product is active/published)
CREATE POLICY "Allow public read of active option values" ON option_values
    FOR SELECT TO public USING (
        EXISTS (
            SELECT 1 FROM option_groups
            JOIN products ON products.id = option_groups.product_id
            WHERE option_groups.id = option_group_id
              AND products.status = 'published'
              AND products.visibility = 'public'
              AND products.archived_at IS NULL
        )
    );

-- Product Variants (Read-only if product is active/published)
CREATE POLICY "Allow public read of active variants" ON product_variants
    FOR SELECT TO public USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_id
              AND products.status = 'published'
              AND products.visibility = 'public'
              AND products.archived_at IS NULL
        )
    );

-- Collections (Read-only to public)
CREATE POLICY "Allow public read of collections" ON collections
    FOR SELECT TO public USING (true);

-- Tags (Read-only to public)
CREATE POLICY "Allow public read of tags" ON tags
    FOR SELECT TO public USING (true);

-- Product Tags (Read-only to public)
CREATE POLICY "Allow public read of product tags" ON product_tags
    FOR SELECT TO public USING (true);

-- Collection Products (Read-only to public)
CREATE POLICY "Allow public read of collection products" ON collection_products
    FOR SELECT TO public USING (true);


-- =============================================================================
-- INVENTORY POLICIES
-- =============================================================================

-- Inventory Records (Read availability to public)
CREATE POLICY "Allow public read of inventory records" ON inventory_records
    FOR SELECT TO public USING (true);

-- Note: inventory_reservations has NO policies (denies all by default)
-- Note: stock_movements has NO policies (denies all by default)


-- =============================================================================
-- CUSTOMER POLICIES
-- =============================================================================

-- Customers (Users can only see/update their own profile)
CREATE POLICY "Allow users to read own customer profile" ON customers
    FOR SELECT TO authenticated USING (auth_id = auth.uid());

CREATE POLICY "Allow users to update own customer profile" ON customers
    FOR UPDATE TO authenticated
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- Customer Addresses (Users can see/manage their own addresses)
CREATE POLICY "Allow users to select own addresses" ON customer_addresses
    FOR SELECT TO authenticated USING (
        customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
    );

CREATE POLICY "Allow users to insert own addresses" ON customer_addresses
    FOR INSERT TO authenticated WITH CHECK (
        customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
    );

CREATE POLICY "Allow users to update own addresses" ON customer_addresses
    FOR UPDATE TO authenticated
    USING (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()))
    WITH CHECK (customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));

CREATE POLICY "Allow users to delete own addresses" ON customer_addresses
    FOR DELETE TO authenticated USING (
        customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
    );


-- =============================================================================
-- CART POLICIES
-- =============================================================================

-- Carts (Anon/Auth users can select/insert/update their own carts)
CREATE POLICY "Allow users to select own carts" ON carts
    FOR SELECT TO public USING (
        customer_id IS NULL OR customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
    );

CREATE POLICY "Allow users to insert own carts" ON carts
    FOR INSERT TO public WITH CHECK (
        customer_id IS NULL OR customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
    );

CREATE POLICY "Allow users to update own carts" ON carts
    FOR UPDATE TO public
    USING (customer_id IS NULL OR customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()))
    WITH CHECK (customer_id IS NULL OR customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid()));

-- Cart Lines (Cascade logic based on Cart access)
CREATE POLICY "Allow users to manage own cart lines select" ON cart_lines
    FOR SELECT TO public USING (
        cart_id IN (SELECT id FROM carts)
    );

CREATE POLICY "Allow users to manage own cart lines insert" ON cart_lines
    FOR INSERT TO public WITH CHECK (
        cart_id IN (SELECT id FROM carts)
    );

CREATE POLICY "Allow users to manage own cart lines update" ON cart_lines
    FOR UPDATE TO public
    USING (cart_id IN (SELECT id FROM carts))
    WITH CHECK (cart_id IN (SELECT id FROM carts));

CREATE POLICY "Allow users to manage own cart lines delete" ON cart_lines
    FOR DELETE TO public USING (
        cart_id IN (SELECT id FROM carts)
    );


-- =============================================================================
-- CHECKOUT POLICIES
-- =============================================================================

-- Checkout Sessions (Read/write own checkout session)
CREATE POLICY "Allow users to manage own checkout sessions" ON checkout_sessions
    FOR ALL TO public USING (
        customer_id IS NULL OR customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
    );


-- =============================================================================
-- SHIPPING POLICIES
-- =============================================================================

-- Fulfilment Methods (Read active methods only)
CREATE POLICY "Allow public read of enabled fulfilment methods" ON fulfilment_methods
    FOR SELECT TO public USING (is_enabled = true);

-- Shipping Zones (Read-only to public)
CREATE POLICY "Allow public read of shipping zones" ON shipping_zones
    FOR SELECT TO public USING (true);

-- Shipping Rates (Read-only to public)
CREATE POLICY "Allow public read of shipping rates" ON shipping_rates
    FOR SELECT TO public USING (true);


-- =============================================================================
-- TRANSACTIONAL POLICIES (Orders & Payments)
-- =============================================================================

-- Orders (Users can read their own orders; writes are server-only)
CREATE POLICY "Allow users to select own orders" ON orders
    FOR SELECT TO authenticated USING (
        customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
    );

-- Order Lines (Users can read their own order lines)
CREATE POLICY "Allow users to select own order lines" ON order_lines
    FOR SELECT TO authenticated USING (
        order_id IN (
            SELECT id FROM orders
            WHERE customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
        )
    );

-- Order Status Events (Users can read their own order's timeline)
CREATE POLICY "Allow users to select own order status events" ON order_status_events
    FOR SELECT TO authenticated USING (
        order_id IN (
            SELECT id FROM orders
            WHERE customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
        )
    );

-- Order Notes (Users can read order notes related to their own orders)
CREATE POLICY "Allow users to select own order notes" ON order_notes
    FOR SELECT TO authenticated USING (
        order_id IN (
            SELECT id FROM orders
            WHERE customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
        )
    );

-- Payment Attempts (Users can read payment attempts related to their own orders)
CREATE POLICY "Allow users to select own payment attempts" ON payment_attempts
    FOR SELECT TO authenticated USING (
        order_id IN (
            SELECT id FROM orders
            WHERE customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
        )
    );

-- Payment Events (Users can read payment events related to their own payment attempts)
CREATE POLICY "Allow users to select own payment events" ON payment_events
    FOR SELECT TO authenticated USING (
        payment_attempt_id IN (
            SELECT id FROM payment_attempts
            WHERE order_id IN (
                SELECT id FROM orders
                WHERE customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
            )
        )
    );


-- =============================================================================
-- PROMOTIONS POLICIES (Active promotions only)
-- =============================================================================

-- Promotions (Read active only)
CREATE POLICY "Allow public read of active promotions" ON promotions
    FOR SELECT TO public USING (
        is_active = true 
        AND (starts_at IS NULL OR starts_at <= now()) 
        AND (ends_at IS NULL OR ends_at >= now())
    );

-- Promotion Rules (Read active rules)
CREATE POLICY "Allow public read of active promotion rules" ON promotion_rules
    FOR SELECT TO public USING (
        promotion_id IN (
            SELECT id FROM promotions 
            WHERE is_active = true 
              AND (starts_at IS NULL OR starts_at <= now()) 
              AND (ends_at IS NULL OR ends_at >= now())
        )
    );

-- Coupon Codes (Read active coupon codes)
CREATE POLICY "Allow public read of active coupon codes" ON coupon_codes
    FOR SELECT TO public USING (
        promotion_id IN (
            SELECT id FROM promotions 
            WHERE is_active = true 
              AND (starts_at IS NULL OR starts_at <= now()) 
              AND (ends_at IS NULL OR ends_at >= now())
        )
    );

-- Note: notification_templates and notification_logs have NO policies (denies all).
