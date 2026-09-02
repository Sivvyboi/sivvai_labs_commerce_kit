-- =============================================================================
-- 20260902044_admin_user_permissions.sql
-- Add Per-User Permission Overrides Table and Update Effective-Permission RLS
--
-- 1. Creates admin_user_permissions table (GRANT/DENY overrides)
-- 2. Enables RLS and creates secure access policies
-- 3. Updates private.admin_has_permission() to evaluate:
--      (role permissions ∪ granted overrides) minus denied overrides,
--      with immunity and full access preservation for protected Owners.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create admin_user_permissions table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_user_permissions (
    admin_user_id UUID NOT NULL
        REFERENCES admin_users(id) ON DELETE CASCADE,

    permission_id UUID NOT NULL
        REFERENCES permissions(id) ON DELETE CASCADE,

    is_granted BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (admin_user_id, permission_id)
);

-- Index for efficient user permission lookups
CREATE INDEX IF NOT EXISTS idx_admin_user_permissions_user
    ON admin_user_permissions(admin_user_id);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security & Grants
-- ---------------------------------------------------------------------------
ALTER TABLE admin_user_permissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON admin_user_permissions TO authenticated, service_role;

-- Admins can view their own overrides; admins with manage_users can view all
DROP POLICY IF EXISTS "Admins can view own user_permissions or with manage_users" ON admin_user_permissions;
CREATE POLICY "Admins can view own user_permissions or with manage_users" ON admin_user_permissions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = admin_user_permissions.admin_user_id
              AND au.auth_user_id = (SELECT auth.uid())
        )
        OR private.admin_has_permission('manage_users')
    );

-- Only admins with manage_users can insert, update, or delete overrides
DROP POLICY IF EXISTS "Admins with manage_users can write admin_user_permissions" ON admin_user_permissions;
CREATE POLICY "Admins with manage_users can write admin_user_permissions" ON admin_user_permissions
    FOR ALL TO authenticated
    USING (private.admin_has_permission('manage_users'))
    WITH CHECK (private.admin_has_permission('manage_users'));

-- ---------------------------------------------------------------------------
-- 3. Helper: private.admin_has_permission_direct
-- Evaluates direct permission for an admin user (Override takes precedence over Role)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.admin_has_permission_direct(
    p_admin_id UUID,
    p_role_id UUID,
    p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_override_granted BOOLEAN;
    v_permission_id UUID;
BEGIN
    SELECT id INTO v_permission_id FROM permissions WHERE key = p_permission_key;
    IF v_permission_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check explicit per-user override (GRANT = true, DENY = false)
    SELECT is_granted INTO v_override_granted
    FROM admin_user_permissions
    WHERE admin_user_id = p_admin_id
      AND permission_id = v_permission_id;

    IF v_override_granted IS NOT NULL THEN
        RETURN v_override_granted;
    END IF;

    -- INHERIT: Fall back to base role permissions
    IF p_role_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role_id = p_role_id
          AND permission_id = v_permission_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION private.admin_has_permission_direct(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_has_permission_direct(UUID, UUID, TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Central RLS Resolver: private.admin_has_permission
-- Evaluates effective permissions for auth.uid() including protected owners & hierarchy
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

    -- 2. Check direct permission (with overrides)
    v_has_perm := private.admin_has_permission_direct(v_admin_id, v_role_id, permission_key);

    -- 3. Hierarchy fallbacks (manage_orders -> view_orders, manage_customers -> view_customers)
    IF NOT v_has_perm THEN
        IF permission_key = 'view_orders' THEN
            v_has_perm := private.admin_has_permission_direct(v_admin_id, v_role_id, 'manage_orders');
        ELSIF permission_key = 'view_customers' THEN
            v_has_perm := private.admin_has_permission_direct(v_admin_id, v_role_id, 'manage_customers');
        END IF;
    END IF;

    RETURN COALESCE(v_has_perm, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION private.admin_has_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_has_permission(TEXT) TO authenticated, service_role;
