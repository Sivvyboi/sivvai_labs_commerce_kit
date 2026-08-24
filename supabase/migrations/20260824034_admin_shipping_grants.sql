-- =============================================================================
-- 20260824034_admin_shipping_grants.sql
-- Admin Shipping Grants and RLS Write Policies
--
-- Enables authenticated admins with `manage_settings` permission to:
--   1. Read all fulfilment_methods (including disabled ones)
--   2. Insert, update, and delete fulfilment_methods
--   3. Insert, update, and delete shipping_zones
--   4. Insert, update, and delete shipping_rates
-- =============================================================================

-- Table-level privileges for authenticated role
GRANT INSERT, UPDATE, DELETE ON fulfilment_methods TO authenticated;
GRANT INSERT, UPDATE, DELETE ON shipping_zones     TO authenticated;
GRANT INSERT, UPDATE, DELETE ON shipping_rates      TO authenticated;

-- ---------------------------------------------------------------------------
-- 1. FULFILMENT METHODS
-- ---------------------------------------------------------------------------
-- Allow admins to see ALL fulfilment methods (public policy only allows is_enabled=true)
DROP POLICY IF EXISTS "Admins with manage_settings can view all fulfilment methods" ON fulfilment_methods;
CREATE POLICY "Admins with manage_settings can view all fulfilment methods" ON fulfilment_methods
    FOR SELECT TO authenticated
    USING (private.admin_has_permission('manage_settings'));

DROP POLICY IF EXISTS "Admins with manage_settings can write fulfilment_methods" ON fulfilment_methods;
CREATE POLICY "Admins with manage_settings can write fulfilment_methods" ON fulfilment_methods
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_settings'))
    WITH CHECK (private.admin_has_permission('manage_settings'));

-- ---------------------------------------------------------------------------
-- 2. SHIPPING ZONES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins with manage_settings can write shipping_zones" ON shipping_zones;
CREATE POLICY "Admins with manage_settings can write shipping_zones" ON shipping_zones
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_settings'))
    WITH CHECK (private.admin_has_permission('manage_settings'));

-- ---------------------------------------------------------------------------
-- 3. SHIPPING RATES
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins with manage_settings can write shipping_rates" ON shipping_rates;
CREATE POLICY "Admins with manage_settings can write shipping_rates" ON shipping_rates
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_settings'))
    WITH CHECK (private.admin_has_permission('manage_settings'));
