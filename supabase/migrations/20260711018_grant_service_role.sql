-- =============================================================================
-- 20260711018_grant_service_role.sql
-- Ensure service_role and anon have explicit table and sequence privileges
-- for carts, cart_lines, and customer evaluation.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT ON customers TO anon;
GRANT SELECT, INSERT, UPDATE ON carts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON cart_lines TO anon, authenticated;
