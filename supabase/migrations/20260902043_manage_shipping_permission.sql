-- =============================================================================
-- 20260902043_manage_shipping_permission.sql
-- Introduce `manage_shipping` Permission and Separate Shipping from `manage_settings`
--
-- 1. Adds 'manage_shipping' to permissions table
-- 2. Assigns 'manage_shipping' to 'owner' and 'manager' roles
-- 3. Updates RLS policies on fulfilment_methods, shipping_zones, and shipping_rates
--    to require private.admin_has_permission('manage_shipping')
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Insert manage_shipping into permissions table
-- ---------------------------------------------------------------------------
INSERT INTO permissions (key, description) VALUES
    ('manage_shipping', 'Manage shipping zones, rates, and fulfilment methods')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Assign manage_shipping to Owner and Manager roles
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    owner_id   UUID := (SELECT id FROM roles WHERE key = 'owner');
    manager_id UUID := (SELECT id FROM roles WHERE key = 'manager');
    p_manage_shipping UUID := (SELECT id FROM permissions WHERE key = 'manage_shipping');
BEGIN
    IF owner_id IS NOT NULL AND p_manage_shipping IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id) VALUES
            (owner_id, p_manage_shipping)
        ON CONFLICT DO NOTHING;
    END IF;

    IF manager_id IS NOT NULL AND p_manage_shipping IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id) VALUES
            (manager_id, p_manage_shipping)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Update Shipping RLS Policies to use manage_shipping
-- ---------------------------------------------------------------------------

-- FULFILMENT METHODS
DROP POLICY IF EXISTS "Admins with manage_settings can view all fulfilment methods" ON fulfilment_methods;
DROP POLICY IF EXISTS "Admins with manage_shipping can view all fulfilment methods" ON fulfilment_methods;
CREATE POLICY "Admins with manage_shipping can view all fulfilment methods" ON fulfilment_methods
    FOR SELECT TO authenticated
    USING (private.admin_has_permission('manage_shipping'));

DROP POLICY IF EXISTS "Admins with manage_settings can write fulfilment_methods" ON fulfilment_methods;
DROP POLICY IF EXISTS "Admins with manage_shipping can write fulfilment_methods" ON fulfilment_methods;
CREATE POLICY "Admins with manage_shipping can write fulfilment_methods" ON fulfilment_methods
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_shipping'))
    WITH CHECK (private.admin_has_permission('manage_shipping'));

-- SHIPPING ZONES
DROP POLICY IF EXISTS "Admins with manage_settings can write shipping_zones" ON shipping_zones;
DROP POLICY IF EXISTS "Admins with manage_shipping can write shipping_zones" ON shipping_zones;
CREATE POLICY "Admins with manage_shipping can write shipping_zones" ON shipping_zones
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_shipping'))
    WITH CHECK (private.admin_has_permission('manage_shipping'));

-- SHIPPING RATES
DROP POLICY IF EXISTS "Admins with manage_settings can write shipping_rates" ON shipping_rates;
DROP POLICY IF EXISTS "Admins with manage_shipping can write shipping_rates" ON shipping_rates;
CREATE POLICY "Admins with manage_shipping can write shipping_rates" ON shipping_rates
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_shipping'))
    WITH CHECK (private.admin_has_permission('manage_shipping'));
