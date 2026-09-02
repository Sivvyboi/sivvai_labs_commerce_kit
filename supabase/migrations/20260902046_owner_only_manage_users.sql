-- =============================================================================
-- 20260902046_owner_only_manage_users.sql
-- Security Hardening: Enforce Owner-Only invariant for manage_users permission
--
-- 1. Updates private.admin_has_permission() to guarantee that manage_users can
--    ONLY be effective for protected Owners (is_protected_owner = true).
-- 2. Non-protected admins cannot obtain manage_users via role assignment or
--    explicit per-user GRANT overrides.
-- =============================================================================

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
