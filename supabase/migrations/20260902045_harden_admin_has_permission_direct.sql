-- =============================================================================
-- 20260902045_harden_admin_has_permission_direct.sql
-- Security Hardening: Revoke authenticated execution on private.admin_has_permission_direct
-- =============================================================================

REVOKE EXECUTE ON FUNCTION private.admin_has_permission_direct(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.admin_has_permission_direct(UUID, UUID, TEXT) TO service_role;
