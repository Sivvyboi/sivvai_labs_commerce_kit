-- =============================================================================
-- 20260801019_admin_auth.sql
-- Admin Users Table & Admin RLS Policies for Authenticated Admin Users
-- =============================================================================

-- 1. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Apply updated_at trigger if set_updated_at function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
        CREATE TRIGGER set_admin_users_updated_at
            BEFORE UPDATE ON admin_users
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON admin_users TO authenticated;
GRANT ALL PRIVILEGES ON admin_users TO service_role;

-- RLS policy for admin_users: Users can view their own record
CREATE POLICY "Admins can view own admin_user record" ON admin_users
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = auth_user_id);

-- RLS policies for store_settings (Admin write)
CREATE POLICY "Allow authenticated admins to update store settings" ON store_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users WHERE auth_user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users WHERE auth_user_id = (SELECT auth.uid())
        )
    );

-- RLS policies for brand_profile (Admin write)
CREATE POLICY "Allow authenticated admins to update brand profile" ON brand_profile
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users WHERE auth_user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users WHERE auth_user_id = (SELECT auth.uid())
        )
    );

-- RLS policies for categories (Admin write)
CREATE POLICY "Allow authenticated admins to manage categories" ON categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users WHERE auth_user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users WHERE auth_user_id = (SELECT auth.uid())
        )
    );

-- RLS policies for products (Admin write)
CREATE POLICY "Allow authenticated admins to manage products" ON products
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users WHERE auth_user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users WHERE auth_user_id = (SELECT auth.uid())
        )
    );

-- RLS policies for promotions (Admin write)
CREATE POLICY "Allow authenticated admins to manage promotions" ON promotions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users WHERE auth_user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users WHERE auth_user_id = (SELECT auth.uid())
        )
    );
