-- =============================================================================
-- 20260901040_auto_release_expired_reservations.sql
--
-- Automatically release inventory reservations that have passed their
-- expires_at timestamp.
--
-- Strategy: pg_cron job runs every minute and bulk-updates all active
-- reservations where expires_at <= now() to status = 'released'.
-- The existing trigger (trigger_update_inventory_reserved_quantity) fires
-- after each UPDATE row and recalculates inventory_records.reserved_quantity,
-- so no additional stock-accounting logic is required here.
--
-- IDEMPOTENT: Safe to re-run. All statements use IF NOT EXISTS / OR REPLACE /
-- SELECT cron.unschedule (ignore error) before scheduling, so re-applying this
-- migration will never leave duplicate cron jobs or fail on existing objects.
-- =============================================================================

-- 1. Enable pg_cron extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Grant pg_cron schema usage to the postgres role (required by Supabase)
--    DO block swallows "already exists" errors so re-runs are safe.
DO $$
BEGIN
    GRANT USAGE ON SCHEMA cron TO postgres;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'GRANT USAGE ON SCHEMA cron: % (continuing)', SQLERRM;
END;
$$;

-- 3. Create (or replace) the function that releases expired reservations.
--    SECURITY DEFINER so it can update rows regardless of caller RLS.
--    search_path locked to public to prevent search-path injection.
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE inventory_reservations
    SET
        status      = 'released',
        released_at = now()
    WHERE
        status     = 'active'
        AND expires_at <= now();
END;
$$;

-- Revoke broad public execute access (defence-in-depth; cron runs as postgres)
REVOKE EXECUTE ON FUNCTION release_expired_reservations() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION release_expired_reservations() TO postgres;

-- 4. Schedule the cron job every minute.
--    Unschedule first (ignore error if job didn't exist) so re-running this
--    migration never creates duplicate jobs.
DO $$
BEGIN
    PERFORM cron.unschedule('release-expired-inventory-reservations');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'cron.unschedule: % (job may not have existed, continuing)', SQLERRM;
END;
$$;

SELECT cron.schedule(
    'release-expired-inventory-reservations',  -- unique job name
    '* * * * *',                               -- every minute
    $$SELECT release_expired_reservations();$$
);
