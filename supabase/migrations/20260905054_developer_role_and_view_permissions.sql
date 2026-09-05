-- =============================================================================
-- 20260905054_developer_role_and_view_permissions.sql
-- Add Developer Role and Granular View Permissions (view_products, view_inventory)
--
-- 1. Adds 'developer' role to roles table.
-- 2. Adds 'view_products' and 'view_inventory' to permissions table.
-- 3. Maps permissions to roles (support gets read-only catalog/inventory;
--    developer gets full operational access excluding manage_users).
-- 4. Updates private.admin_has_permission() with hierarchy fallbacks for
--    view_products (satisfied by manage_products) and view_inventory (satisfied by manage_inventory).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Insert developer role
-- ---------------------------------------------------------------------------
INSERT INTO roles (key, name, description)
VALUES ('developer', 'Developer', 'Full access to all features except administrator user management')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Insert view_products and view_inventory permissions
-- ---------------------------------------------------------------------------
INSERT INTO permissions (key, description) VALUES
    ('view_products',  'View products and catalog details (read-only)'),
    ('view_inventory', 'View inventory levels and stock movements (read-only)')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Assign role permissions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    owner_id     UUID := (SELECT id FROM roles WHERE key = 'owner');
    manager_id   UUID := (SELECT id FROM roles WHERE key = 'manager');
    editor_id    UUID := (SELECT id FROM roles WHERE key = 'editor');
    support_id   UUID := (SELECT id FROM roles WHERE key = 'support');
    developer_id UUID := (SELECT id FROM roles WHERE key = 'developer');

    p_view_products    UUID := (SELECT id FROM permissions WHERE key = 'view_products');
    p_view_inventory   UUID := (SELECT id FROM permissions WHERE key = 'view_inventory');
    p_manage_products  UUID := (SELECT id FROM permissions WHERE key = 'manage_products');
    p_manage_categories UUID := (SELECT id FROM permissions WHERE key = 'manage_categories');
    p_manage_inventory UUID := (SELECT id FROM permissions WHERE key = 'manage_inventory');
    p_manage_orders    UUID := (SELECT id FROM permissions WHERE key = 'manage_orders');
    p_view_orders      UUID := (SELECT id FROM permissions WHERE key = 'view_orders');
    p_manage_customers UUID := (SELECT id FROM permissions WHERE key = 'manage_customers');
    p_view_customers   UUID := (SELECT id FROM permissions WHERE key = 'view_customers');
    p_manage_promotions UUID := (SELECT id FROM permissions WHERE key = 'manage_promotions');
    p_manage_shipping  UUID := (SELECT id FROM permissions WHERE key = 'manage_shipping');
    p_manage_settings  UUID := (SELECT id FROM permissions WHERE key = 'manage_settings');
    p_view_activity    UUID := (SELECT id FROM permissions WHERE key = 'view_activity');
BEGIN
    -- Owner: gets new view permissions
    IF owner_id IS NOT NULL THEN
        IF p_view_products IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id) VALUES (owner_id, p_view_products) ON CONFLICT DO NOTHING;
        END IF;
        IF p_view_inventory IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id) VALUES (owner_id, p_view_inventory) ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Manager: gets new view permissions
    IF manager_id IS NOT NULL THEN
        IF p_view_products IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id) VALUES (manager_id, p_view_products) ON CONFLICT DO NOTHING;
        END IF;
        IF p_view_inventory IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id) VALUES (manager_id, p_view_inventory) ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Editor: gets view_products
    IF editor_id IS NOT NULL AND p_view_products IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id) VALUES (editor_id, p_view_products) ON CONFLICT DO NOTHING;
    END IF;

    -- Support: gets view_products and view_inventory
    IF support_id IS NOT NULL THEN
        IF p_view_products IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id) VALUES (support_id, p_view_products) ON CONFLICT DO NOTHING;
        END IF;
        IF p_view_inventory IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id) VALUES (support_id, p_view_inventory) ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Developer: gets all operational permissions EXCEPT manage_users
    IF developer_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES
            (developer_id, p_manage_products),
            (developer_id, p_view_products),
            (developer_id, p_manage_categories),
            (developer_id, p_manage_inventory),
            (developer_id, p_view_inventory),
            (developer_id, p_manage_orders),
            (developer_id, p_view_orders),
            (developer_id, p_manage_customers),
            (developer_id, p_view_customers),
            (developer_id, p_manage_promotions),
            (developer_id, p_manage_shipping),
            (developer_id, p_manage_settings),
            (developer_id, p_view_activity)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Update private.admin_has_permission to support hierarchy fallbacks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.admin_has_permission(permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_id UUID;
    v_role_id UUID;
    v_is_protected_owner BOOLEAN;
    v_has_perm BOOLEAN;
BEGIN
    -- 1. Identify active admin user
    SELECT au.id, au.role_id, COALESCE(au.is_protected_owner, false)
    INTO v_admin_id, v_role_id, v_is_protected_owner
    FROM admin_users au
    WHERE au.auth_user_id = (SELECT auth.uid())
      AND au.is_active = true;

    -- Fail closed if no active admin context
    IF v_admin_id IS NULL THEN
        RETURN false;
    END IF;

    -- Protected owners always retain all permissions regardless of overrides
    IF v_is_protected_owner THEN
        RETURN true;
    END IF;

    -- INVARIANT: manage_users is strictly Owner-only.
    -- Non-protected staff members MUST NEVER obtain effective manage_users,
    -- even via role assignment or explicit per-user GRANT override.
    IF permission_key = 'manage_users' THEN
        RETURN false;
    END IF;

    -- 2. Check direct permission (with overrides)
    v_has_perm := private.admin_has_permission_direct(v_admin_id, v_role_id, permission_key);

    -- 3. Hierarchy fallbacks
    IF NOT v_has_perm THEN
        IF permission_key = 'view_orders' THEN
            v_has_perm := private.admin_has_permission_direct(v_admin_id, v_role_id, 'manage_orders');
        ELSIF permission_key = 'view_customers' THEN
            v_has_perm := private.admin_has_permission_direct(v_admin_id, v_role_id, 'manage_customers');
        ELSIF permission_key = 'view_products' THEN
            v_has_perm := private.admin_has_permission_direct(v_admin_id, v_role_id, 'manage_products');
        ELSIF permission_key = 'view_inventory' THEN
            v_has_perm := private.admin_has_permission_direct(v_admin_id, v_role_id, 'manage_inventory');
        END IF;
    END IF;

    RETURN COALESCE(v_has_perm, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION private.admin_has_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_has_permission(TEXT) TO authenticated, service_role;
