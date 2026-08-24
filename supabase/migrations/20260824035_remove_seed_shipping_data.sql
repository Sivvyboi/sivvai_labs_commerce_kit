-- =============================================================================
-- 20260824035_remove_seed_shipping_data.sql
-- Remove seeded demo shipping zones, fulfilment methods, and rates so that
-- stores start with an empty, fully admin-controlled shipping configuration.
-- Only targets the specific fixed UUIDs created by the initial seed migration.
-- =============================================================================

-- 1. Remove seeded shipping rates
DELETE FROM shipping_rates
WHERE id IN (
    '00000000-0000-0000-0000-000000001000'::uuid,
    '00000000-0000-0000-0000-000000002000'::uuid
);

-- 2. Remove seeded shipping zones
DELETE FROM shipping_zones
WHERE id IN (
    '00000000-0000-0000-0000-000000000010'::uuid,
    '00000000-0000-0000-0000-000000000020'::uuid
);

-- 3. Remove seeded fulfilment methods (only if not referenced by active checkout sessions)
DELETE FROM fulfilment_methods
WHERE id IN (
    '00000000-0000-0000-0000-000000000100'::uuid,
    '00000000-0000-0000-0000-000000000200'::uuid,
    '00000000-0000-0000-0000-000000000300'::uuid
)
AND id NOT IN (
    SELECT DISTINCT fulfilment_method_id
    FROM checkout_sessions
    WHERE fulfilment_method_id IS NOT NULL
);
