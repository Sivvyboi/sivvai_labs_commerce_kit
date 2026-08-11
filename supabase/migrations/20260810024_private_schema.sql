-- =============================================================================
-- 20260810024_private_schema.sql
-- Security Hardening: Move SECURITY DEFINER helper functions to private schema.
-- Prevent anonymous/public access via Data API to sensitive admin functions.
-- =============================================================================

-- 1. Create unexposed private schema
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke all privileges on private schema from public and anon
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Create private.admin_has_permission(permission_key TEXT)
CREATE OR REPLACE FUNCTION private.admin_has_permission(permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM admin_users au
        JOIN role_permissions rp ON rp.role_id = au.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE au.auth_user_id = (SELECT auth.uid())
          AND au.is_active = true
          AND p.key = permission_key
    );
$$;

-- Revoke execute from PUBLIC/anon; grant explicitly to authenticated and service_role
REVOKE EXECUTE ON FUNCTION private.admin_has_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_has_permission(TEXT) TO authenticated, service_role;

-- 3. Create private.count_active_owners()
CREATE OR REPLACE FUNCTION private.count_active_owners()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM admin_users au
    JOIN roles r ON r.id = au.role_id
    WHERE r.key = 'owner' AND au.is_active = true;
$$;

-- Revoke execute from PUBLIC, anon, and authenticated; grant ONLY to service_role
REVOKE EXECUTE ON FUNCTION private.count_active_owners() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.count_active_owners() TO service_role;

-- 4. Update RLS policies to reference private.admin_has_permission(...)

-- store_settings
DROP POLICY IF EXISTS "Admins with manage_settings can write store_settings" ON store_settings;
CREATE POLICY "Admins with manage_settings can write store_settings" ON store_settings
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_settings'))
    WITH CHECK (private.admin_has_permission('manage_settings'));

-- brand_profile
DROP POLICY IF EXISTS "Admins with manage_settings can write brand_profile" ON brand_profile;
CREATE POLICY "Admins with manage_settings can write brand_profile" ON brand_profile
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_settings'))
    WITH CHECK (private.admin_has_permission('manage_settings'));

-- feature_flags
DROP POLICY IF EXISTS "Admins with manage_settings can write feature_flags" ON feature_flags;
CREATE POLICY "Admins with manage_settings can write feature_flags" ON feature_flags
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_settings'))
    WITH CHECK (private.admin_has_permission('manage_settings'));

-- categories
DROP POLICY IF EXISTS "Admins with manage_categories can write categories" ON categories;
CREATE POLICY "Admins with manage_categories can write categories" ON categories
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_categories'))
    WITH CHECK (private.admin_has_permission('manage_categories'));

-- products & sub-tables
DROP POLICY IF EXISTS "Admins with manage_products can write products" ON products;
CREATE POLICY "Admins with manage_products can write products" ON products
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_products'))
    WITH CHECK (private.admin_has_permission('manage_products'));

DROP POLICY IF EXISTS "Admins with manage_products can write product_images" ON product_images;
CREATE POLICY "Admins with manage_products can write product_images" ON product_images
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_products'))
    WITH CHECK (private.admin_has_permission('manage_products'));

DROP POLICY IF EXISTS "Admins with manage_products can write product_variants" ON product_variants;
CREATE POLICY "Admins with manage_products can write product_variants" ON product_variants
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_products'))
    WITH CHECK (private.admin_has_permission('manage_products'));

-- promotions & sub-tables
DROP POLICY IF EXISTS "Admins with manage_promotions can write promotions" ON promotions;
CREATE POLICY "Admins with manage_promotions can write promotions" ON promotions
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_promotions'))
    WITH CHECK (private.admin_has_permission('manage_promotions'));

DROP POLICY IF EXISTS "Admins with manage_promotions can write promotion_rules" ON promotion_rules;
CREATE POLICY "Admins with manage_promotions can write promotion_rules" ON promotion_rules
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_promotions'))
    WITH CHECK (private.admin_has_permission('manage_promotions'));

DROP POLICY IF EXISTS "Admins with manage_promotions can write coupon_codes" ON coupon_codes;
CREATE POLICY "Admins with manage_promotions can write coupon_codes" ON coupon_codes
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_promotions'))
    WITH CHECK (private.admin_has_permission('manage_promotions'));

-- inventory
DROP POLICY IF EXISTS "Admins with manage_inventory can write inventory_records" ON inventory_records;
CREATE POLICY "Admins with manage_inventory can write inventory_records" ON inventory_records
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_inventory'))
    WITH CHECK (private.admin_has_permission('manage_inventory'));

DROP POLICY IF EXISTS "Admins with manage_inventory can write stock_movements" ON stock_movements;
CREATE POLICY "Admins with manage_inventory can write stock_movements" ON stock_movements
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_inventory'))
    WITH CHECK (private.admin_has_permission('manage_inventory'));

-- orders
DROP POLICY IF EXISTS "Admins with view_orders can read orders" ON orders;
CREATE POLICY "Admins with view_orders can read orders" ON orders
    FOR SELECT TO authenticated
    USING (private.admin_has_permission('view_orders'));

DROP POLICY IF EXISTS "Admins with manage_orders can write orders" ON orders;
CREATE POLICY "Admins with manage_orders can write orders" ON orders
    FOR UPDATE TO authenticated
    USING (private.admin_has_permission('manage_orders'))
    WITH CHECK (private.admin_has_permission('manage_orders'));

DROP POLICY IF EXISTS "Admins with view_orders can read order_lines" ON order_lines;
CREATE POLICY "Admins with view_orders can read order_lines" ON order_lines
    FOR SELECT TO authenticated
    USING (private.admin_has_permission('view_orders'));

DROP POLICY IF EXISTS "Admins with manage_orders can write order_status_events" ON order_status_events;
CREATE POLICY "Admins with manage_orders can write order_status_events" ON order_status_events
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_orders'))
    WITH CHECK (private.admin_has_permission('manage_orders'));

DROP POLICY IF EXISTS "Admins with manage_orders can write order_notes" ON order_notes;
CREATE POLICY "Admins with manage_orders can write order_notes" ON order_notes
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_orders'))
    WITH CHECK (private.admin_has_permission('manage_orders'));

-- customers
DROP POLICY IF EXISTS "Admins with view_customers can read customers" ON customers;
CREATE POLICY "Admins with view_customers can read customers" ON customers
    FOR SELECT TO authenticated
    USING (private.admin_has_permission('view_customers'));

DROP POLICY IF EXISTS "Admins with manage_customers can write customers" ON customers;
CREATE POLICY "Admins with manage_customers can write customers" ON customers
    FOR UPDATE TO authenticated
    USING (private.admin_has_permission('manage_customers'))
    WITH CHECK (private.admin_has_permission('manage_customers'));

-- admin_users
DROP POLICY IF EXISTS "Admins with manage_users can manage admin_users" ON admin_users;
CREATE POLICY "Admins with manage_users can manage admin_users" ON admin_users
    FOR ALL TO authenticated
    USING (
        (SELECT auth.uid()) = auth_user_id
        OR private.admin_has_permission('manage_users')
    )
    WITH CHECK (private.admin_has_permission('manage_users'));

-- admin_invitations
DROP POLICY IF EXISTS "Admins with manage_users can manage invitations" ON admin_invitations;
CREATE POLICY "Admins with manage_users can manage invitations" ON admin_invitations
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_users'))
    WITH CHECK (private.admin_has_permission('manage_users'));

-- 5. Drop deprecated public functions
DROP FUNCTION IF EXISTS public.admin_has_permission(TEXT);
DROP FUNCTION IF EXISTS public.count_active_owners();
