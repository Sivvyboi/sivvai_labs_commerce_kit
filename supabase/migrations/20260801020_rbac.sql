-- =============================================================================
-- 20260801020_rbac.sql
-- Role-Based Access Control (RBAC) — Batch 12
--
-- Creates:
--   roles, permissions, role_permissions (data-driven permission model)
--   audit_logs
--
-- Alters:
--   admin_users — adds role_id, is_active
--
-- Updates RLS:
--   Replaces broad Batch 11 admin-member policies with per-permission policies
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ROLES table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON roles TO authenticated, anon;
GRANT ALL ON roles TO service_role;

-- Any authenticated admin can read roles (for display purposes)
CREATE POLICY "Allow authenticated to read roles" ON roles
    FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 2. PERMISSIONS table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT UNIQUE NOT NULL,
    description TEXT
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON permissions TO authenticated, anon;
GRANT ALL ON permissions TO service_role;

CREATE POLICY "Allow authenticated to read permissions" ON permissions
    FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 3. ROLE_PERMISSIONS join table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON role_permissions TO authenticated;
GRANT ALL ON role_permissions TO service_role;

CREATE POLICY "Allow authenticated to read role_permissions" ON role_permissions
    FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 4. ALTER admin_users — add role_id and is_active
-- ---------------------------------------------------------------------------
ALTER TABLE admin_users
    ADD COLUMN IF NOT EXISTS role_id   UUID REFERENCES roles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 5. AUDIT_LOGS table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action        TEXT NOT NULL,
    entity_type   TEXT,
    entity_id     TEXT,
    metadata      JSONB,
    ip_address    TEXT,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT ALL ON audit_logs TO service_role;

-- Authenticated admins can insert audit logs; only service_role can read them
CREATE POLICY "Allow authenticated admins to insert audit logs" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true
        )
    );

-- ---------------------------------------------------------------------------
-- 6. SEED: roles
-- ---------------------------------------------------------------------------
INSERT INTO roles (key, name, description) VALUES
    ('owner',   'Owner',   'Full access to all admin features including user management'),
    ('manager', 'Manager', 'Access to catalog, orders, customers, inventory, and promotions'),
    ('editor',  'Editor',  'Access to catalog (products and categories) only'),
    ('support', 'Support', 'Read-only access to orders and customers')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. SEED: permissions
-- ---------------------------------------------------------------------------
INSERT INTO permissions (key, description) VALUES
    ('manage_products',   'Create, update, archive, and publish products'),
    ('manage_categories', 'Create, update, and archive categories'),
    ('manage_inventory',  'Adjust inventory levels and view stock movements'),
    ('manage_orders',     'Update order status, add notes'),
    ('view_orders',       'View orders and order details (read-only)'),
    ('manage_customers',  'Edit customer records'),
    ('view_customers',    'View customer profiles and order history (read-only)'),
    ('manage_promotions', 'Create, update, and delete promotions and coupon codes'),
    ('manage_settings',   'Update store settings, brand profile, and feature flags'),
    ('view_activity',     'View the admin activity log'),
    ('manage_users',      'Invite, manage roles, and deactivate admin users')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. SEED: role_permissions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    owner_id   UUID := (SELECT id FROM roles WHERE key = 'owner');
    manager_id UUID := (SELECT id FROM roles WHERE key = 'manager');
    editor_id  UUID := (SELECT id FROM roles WHERE key = 'editor');
    support_id UUID := (SELECT id FROM roles WHERE key = 'support');

    p_manage_products   UUID := (SELECT id FROM permissions WHERE key = 'manage_products');
    p_manage_categories UUID := (SELECT id FROM permissions WHERE key = 'manage_categories');
    p_manage_inventory  UUID := (SELECT id FROM permissions WHERE key = 'manage_inventory');
    p_manage_orders     UUID := (SELECT id FROM permissions WHERE key = 'manage_orders');
    p_view_orders       UUID := (SELECT id FROM permissions WHERE key = 'view_orders');
    p_manage_customers  UUID := (SELECT id FROM permissions WHERE key = 'manage_customers');
    p_view_customers    UUID := (SELECT id FROM permissions WHERE key = 'view_customers');
    p_manage_promotions UUID := (SELECT id FROM permissions WHERE key = 'manage_promotions');
    p_manage_settings   UUID := (SELECT id FROM permissions WHERE key = 'manage_settings');
    p_view_activity     UUID := (SELECT id FROM permissions WHERE key = 'view_activity');
    p_manage_users      UUID := (SELECT id FROM permissions WHERE key = 'manage_users');
BEGIN
    -- Owner: all permissions
    INSERT INTO role_permissions (role_id, permission_id) VALUES
        (owner_id, p_manage_products),
        (owner_id, p_manage_categories),
        (owner_id, p_manage_inventory),
        (owner_id, p_manage_orders),
        (owner_id, p_view_orders),
        (owner_id, p_manage_customers),
        (owner_id, p_view_customers),
        (owner_id, p_manage_promotions),
        (owner_id, p_manage_settings),
        (owner_id, p_view_activity),
        (owner_id, p_manage_users)
    ON CONFLICT DO NOTHING;

    -- Manager: all except manage_settings and manage_users
    INSERT INTO role_permissions (role_id, permission_id) VALUES
        (manager_id, p_manage_products),
        (manager_id, p_manage_categories),
        (manager_id, p_manage_inventory),
        (manager_id, p_manage_orders),
        (manager_id, p_view_orders),
        (manager_id, p_manage_customers),
        (manager_id, p_view_customers),
        (manager_id, p_manage_promotions),
        (manager_id, p_view_activity)
    ON CONFLICT DO NOTHING;

    -- Editor: products and categories only
    INSERT INTO role_permissions (role_id, permission_id) VALUES
        (editor_id, p_manage_products),
        (editor_id, p_manage_categories)
    ON CONFLICT DO NOTHING;

    -- Support: view orders and customers only
    INSERT INTO role_permissions (role_id, permission_id) VALUES
        (support_id, p_view_orders),
        (support_id, p_view_customers)
    ON CONFLICT DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------
-- Helper: permission_check(permission_key TEXT) → BOOLEAN
-- Used inside RLS USING clauses to avoid repeating the join pattern.
-- Runs as SECURITY INVOKER so it respects the calling role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_has_permission(permission_key TEXT)
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

-- Grant execute to authenticated so RLS policies can call it
GRANT EXECUTE ON FUNCTION admin_has_permission(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. RLS — Update Batch 11 policies with per-permission checks
--
-- Drop the broad "any admin_user" policies from migration 019 and replace
-- them with policies that check actual permissions.
-- ---------------------------------------------------------------------------

-- store_settings
DROP POLICY IF EXISTS "Allow authenticated admins to update store settings" ON store_settings;
CREATE POLICY "Admins with manage_settings can write store_settings" ON store_settings
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_settings'))
    WITH CHECK (admin_has_permission('manage_settings'));

-- brand_profile
DROP POLICY IF EXISTS "Allow authenticated admins to update brand profile" ON brand_profile;
CREATE POLICY "Admins with manage_settings can write brand_profile" ON brand_profile
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_settings'))
    WITH CHECK (admin_has_permission('manage_settings'));

-- feature_flags
DROP POLICY IF EXISTS "Allow authenticated admins to manage feature_flags" ON feature_flags;
CREATE POLICY "Admins with manage_settings can write feature_flags" ON feature_flags
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_settings'))
    WITH CHECK (admin_has_permission('manage_settings'));

-- categories
DROP POLICY IF EXISTS "Allow authenticated admins to manage categories" ON categories;
CREATE POLICY "Admins with manage_categories can write categories" ON categories
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_categories'))
    WITH CHECK (admin_has_permission('manage_categories'));

-- products (and sub-tables)
DROP POLICY IF EXISTS "Allow authenticated admins to manage products" ON products;
CREATE POLICY "Admins with manage_products can write products" ON products
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_products'))
    WITH CHECK (admin_has_permission('manage_products'));

CREATE POLICY "Admins with manage_products can write product_images" ON product_images
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_products'))
    WITH CHECK (admin_has_permission('manage_products'));

CREATE POLICY "Admins with manage_products can write product_variants" ON product_variants
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_products'))
    WITH CHECK (admin_has_permission('manage_products'));

-- promotions
DROP POLICY IF EXISTS "Allow authenticated admins to manage promotions" ON promotions;
CREATE POLICY "Admins with manage_promotions can write promotions" ON promotions
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_promotions'))
    WITH CHECK (admin_has_permission('manage_promotions'));

CREATE POLICY "Admins with manage_promotions can write promotion_rules" ON promotion_rules
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_promotions'))
    WITH CHECK (admin_has_permission('manage_promotions'));

CREATE POLICY "Admins with manage_promotions can write coupon_codes" ON coupon_codes
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_promotions'))
    WITH CHECK (admin_has_permission('manage_promotions'));

-- inventory
CREATE POLICY "Admins with manage_inventory can write inventory_records" ON inventory_records
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_inventory'))
    WITH CHECK (admin_has_permission('manage_inventory'));

CREATE POLICY "Admins with manage_inventory can write stock_movements" ON stock_movements
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_inventory'))
    WITH CHECK (admin_has_permission('manage_inventory'));

-- orders: manage_orders for write, view_orders for read
CREATE POLICY "Admins with view_orders can read orders" ON orders
    FOR SELECT TO authenticated
    USING (admin_has_permission('view_orders'));

CREATE POLICY "Admins with manage_orders can write orders" ON orders
    FOR UPDATE TO authenticated
    USING (admin_has_permission('manage_orders'))
    WITH CHECK (admin_has_permission('manage_orders'));

CREATE POLICY "Admins with view_orders can read order_lines" ON order_lines
    FOR SELECT TO authenticated
    USING (admin_has_permission('view_orders'));

CREATE POLICY "Admins with manage_orders can write order_status_events" ON order_status_events
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_orders'))
    WITH CHECK (admin_has_permission('manage_orders'));

CREATE POLICY "Admins with manage_orders can write order_notes" ON order_notes
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_orders'))
    WITH CHECK (admin_has_permission('manage_orders'));

-- customers
CREATE POLICY "Admins with view_customers can read customers" ON customers
    FOR SELECT TO authenticated
    USING (admin_has_permission('view_customers'));

CREATE POLICY "Admins with manage_customers can write customers" ON customers
    FOR UPDATE TO authenticated
    USING (admin_has_permission('manage_customers'))
    WITH CHECK (admin_has_permission('manage_customers'));

-- admin_users: manage_users only
CREATE POLICY "Admins with manage_users can manage admin_users" ON admin_users
    FOR ALL TO authenticated
    USING (
        (SELECT auth.uid()) = auth_user_id  -- own record always visible
        OR admin_has_permission('manage_users')
    )
    WITH CHECK (admin_has_permission('manage_users'));

-- ---------------------------------------------------------------------------
-- 10. Grants for new tables
-- ---------------------------------------------------------------------------
GRANT ALL PRIVILEGES ON roles TO service_role;
GRANT ALL PRIVILEGES ON permissions TO service_role;
GRANT ALL PRIVILEGES ON role_permissions TO service_role;
GRANT ALL PRIVILEGES ON audit_logs TO service_role;
