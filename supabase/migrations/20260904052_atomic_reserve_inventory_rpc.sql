-- =============================================================================
-- 20260904052_atomic_reserve_inventory_rpc.sql
-- Inventory Domain: Atomic multi-item inventory reservation RPC
--
-- Replaces the application-level check-then-insert reservation sequence with a
-- single DB function that:
--   1. Acquires a per-variant advisory transaction lock (pg_advisory_xact_lock)
--      to serialise concurrent reservation attempts on the same variant.
--   2. Locks the inventory_records row FOR UPDATE to prevent phantom reads
--      within the same transaction.
--   3. Computes authoritative available = on_hand_quantity - reserved_quantity
--      AFTER the lock is held (not a pre-flight estimate).
--   4. Raises a structured exception if available < requested quantity.
--   5. Inserts the reservation row; the existing trigger
--      (trigger_update_inventory_reserved_quantity) recalculates
--      reserved_quantity atomically — no manual update needed.
--
-- If ANY item in the batch is under-stocked the entire function raises and the
-- calling transaction rolls back, leaving no partial reservations.
--
-- Exception format (parseable by the application layer):
--   INSUFFICIENT_STOCK:variant=<uuid>:requested=<n>:available=<n>
--
-- IDEMPOTENT: Safe to re-run (CREATE OR REPLACE + grants idempotent).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reserve_inventory_items(
    p_checkout_session_id uuid,
    p_items               jsonb,       -- [{variant_id: uuid, quantity: int}]
    p_duration_minutes    int DEFAULT 15
)
RETURNS jsonb                          -- [{reservation_id, variant_id, quantity, expires_at}]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item          jsonb;
    v_variant_id    uuid;
    v_quantity      int;
    v_inv           inventory_records%ROWTYPE;
    v_available     int;
    v_expires_at    timestamptz;
    v_reservation_id uuid;
    v_result        jsonb := '[]'::jsonb;
BEGIN
    v_expires_at := now() + (p_duration_minutes * interval '1 minute');

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_variant_id := (v_item->>'variant_id')::uuid;
        v_quantity   := (v_item->>'quantity')::int;

        -- Validate quantity is positive.
        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY:variant=%:quantity=%', v_variant_id, v_quantity;
        END IF;

        -- Acquire an advisory transaction lock keyed to the variant's ID hash.
        -- This serialises concurrent calls that attempt to reserve the same
        -- variant within overlapping transactions. Lock is released automatically
        -- when the calling transaction commits or rolls back.
        PERFORM pg_advisory_xact_lock(hashtext(v_variant_id::text));

        -- Lock the inventory row for the duration of this transaction.
        -- FOR UPDATE prevents another transaction reading a stale snapshot.
        SELECT * INTO v_inv
        FROM public.inventory_records
        WHERE variant_id = v_variant_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'NO_INVENTORY_RECORD:variant=%', v_variant_id;
        END IF;

        -- Compute authoritative available stock while the lock is held.
        -- reserved_quantity is maintained by trigger_update_inventory_reserved_quantity
        -- and therefore reflects all committed active reservations.
        IF v_inv.track_inventory THEN
            v_available := v_inv.on_hand_quantity - v_inv.reserved_quantity;

            IF v_available < v_quantity THEN
                RAISE EXCEPTION 'INSUFFICIENT_STOCK:variant=%:requested=%:available=%',
                    v_variant_id, v_quantity, v_available;
            END IF;
        END IF;

        -- Insert reservation row.
        -- The trigger (trigger_update_inventory_reserved_quantity) fires AFTER this
        -- INSERT and recalculates inventory_records.reserved_quantity from the
        -- SUM of all active, non-expired reservations. We do NOT manually
        -- increment reserved_quantity here.
        INSERT INTO public.inventory_reservations (
            inventory_record_id,
            variant_id,
            checkout_session_id,
            quantity,
            expires_at,
            status
        ) VALUES (
            v_inv.id,
            v_variant_id,
            p_checkout_session_id,
            v_quantity,
            v_expires_at,
            'active'
        )
        RETURNING id INTO v_reservation_id;

        v_result := v_result || jsonb_build_object(
            'reservation_id',       v_reservation_id,
            'inventory_record_id',  v_inv.id,
            'variant_id',           v_variant_id,
            'quantity',             v_quantity,
            'expires_at',           v_expires_at
        );
    END LOOP;

    RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (checkout flow) and service_role (admin/cron).
GRANT EXECUTE ON FUNCTION public.reserve_inventory_items(uuid, jsonb, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_inventory_items(uuid, jsonb, int) TO service_role;
