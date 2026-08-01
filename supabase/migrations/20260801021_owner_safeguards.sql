-- =============================================================================
-- 20260801021_owner_safeguards.sql
-- Owner Safeguards & Lockout Protection
--
-- Creates:
--   is_protected_owner column on admin_users
--   count_active_owners() SQL helper function
-- =============================================================================

-- 1. Add is_protected_owner column to admin_users
ALTER TABLE admin_users
    ADD COLUMN IF NOT EXISTS is_protected_owner BOOLEAN NOT NULL DEFAULT false;

-- 2. SQL Helper: count_active_owners()
CREATE OR REPLACE FUNCTION count_active_owners()
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

GRANT EXECUTE ON FUNCTION count_active_owners() TO authenticated, service_role;
