-- =============================================================================
-- 20260905057_restrict_set_default_variant_to_service_role.sql
-- Security Hardening: Restrict set_product_default_variant to service_role
--
-- Previously this admin-only operation was callable by any 'authenticated' user
-- (i.e., any logged-in customer). This allowed any authenticated user to flip the
-- default variant on any product in the storefront.
--
-- Fix: REVOKE EXECUTE from 'authenticated' and PUBLIC.
-- Only 'service_role' (admin server actions, background jobs) may call this.
-- All callers in the codebase already use createAdminClient() which runs as
-- service_role. No production flow is impacted.
--
-- The function body and signature are unchanged.
-- IDEMPOTENT: Safe to re-run (REVOKE is idempotent).
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.set_product_default_variant(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.set_product_default_variant(uuid, uuid) TO service_role;
