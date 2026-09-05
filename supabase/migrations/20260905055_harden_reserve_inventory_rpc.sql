-- =============================================================================
-- 20260905055_harden_reserve_inventory_rpc.sql
-- Security Hardening: reserve_inventory_items authorization layer
--
-- Adds three guards that run BEFORE any lock or stock check:
--
--  1. SESSION OWNERSHIP
--     When the caller is an authenticated user (auth.uid() is non-NULL), the
--     checkout session must belong to a customer whose auth_id matches the
--     caller. Service-role calls (auth.uid() = NULL) skip this check and are
--     trusted by design — the checkout-service already validates ownership.
--
--  2. SESSION STATUS
--     Only sessions in 'open' status may have new reservations attached.
--     Completed or expired sessions are rejected before any lock is acquired.
--
--  3. VARIANT PUBLICATION STATE
--     Each variant must be active, non-archived, and belong to a published,
--     non-archived, non-deleted product. Attempting to reserve a draft or
--     archived variant raises a structured exception before any lock.
--
-- All existing locking, atomicity, and INSUFFICIENT_STOCK exception semantics
-- are preserved. Grants are unchanged (authenticated + service_role).
--
-- IDEMPOTENT: Safe to re-run (CREATE OR REPLACE).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reserve_inventory_items(
    p_checkout_session_id uuid,
    p_items               jsonb,       -- [{variant_id: uuid, quantity: int}]
    p_duration_minutes    int DEFAULT 15
)
RETURNS jsonb                          -- [{reservation_id, inventory_record_id, variant_id, quantity, expires_at}]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session        checkout_sessions%ROWTYPE;
    v_caller_id      uuid;
    v_item           jsonb;
    v_variant_id     uuid;
    v_quantity       int;
    v_inv            inventory_records%ROWTYPE;
    v_available      int;
    v_expires_at     timestamptz;
    v_reservation_id uuid;
    v_result         jsonb := '[]'::jsonb;
BEGIN
    -- -------------------------------------------------------------------------
    -- 0. Identify the caller.
    --    auth.uid() returns NULL for service_role / admin clients. Authenticated
    --    user sessions return the user's UUID.
    -- -------------------------------------------------------------------------
    v_caller_id := auth.uid();

    -- -------------------------------------------------------------------------
    -- 1. Validate items array is non-empty before acquiring any lock.
    -- -------------------------------------------------------------------------
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'INVALID_ITEMS:empty or null items array for checkout_session=%',
            p_checkout_session_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- 2. Lock and validate the checkout session.
    --    FOR UPDATE serialises concurrent reservation attempts on the same
    --    session and prevents status changes racing under us.
    -- -------------------------------------------------------------------------
    SELECT * INTO v_session
    FROM public.checkout_sessions
    WHERE id = p_checkout_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_SESSION:checkout_session=% not found',
            p_checkout_session_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- 3. SESSION STATUS GUARD
    --    Only 'open' sessions may have inventory reserved against them.
    -- -------------------------------------------------------------------------
    IF v_session.status <> 'open' THEN
        RAISE EXCEPTION 'INVALID_SESSION_STATE:checkout_session=%:status=% — only open sessions may reserve inventory',
            p_checkout_session_id, v_session.status;
    END IF;

    -- -------------------------------------------------------------------------
    -- 4. SESSION OWNERSHIP GUARD (authenticated callers only)
    --    Service-role clients (admin server, cron) pass auth.uid() = NULL and
    --    are trusted. Authenticated users must own the session via their
    --    customer record.
    -- -------------------------------------------------------------------------
    IF v_caller_id IS NOT NULL THEN
        IF v_session.customer_id IS NULL OR NOT EXISTS (
            SELECT 1
            FROM public.customers
            WHERE id        = v_session.customer_id
              AND auth_id   = v_caller_id
        ) THEN
            RAISE EXCEPTION 'UNAUTHORIZED:checkout_session=% does not belong to the authenticated caller',
                p_checkout_session_id;
        END IF;
    END IF;

    v_expires_at := now() + (p_duration_minutes * interval '1 minute');

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_variant_id := (v_item->>'variant_id')::uuid;
        v_quantity   := (v_item->>'quantity')::int;

        -- Validate quantity is positive.
        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY:variant=%:quantity=%', v_variant_id, v_quantity;
        END IF;

        -- ---------------------------------------------------------------------
        -- 5. VARIANT PUBLICATION STATE GUARD
        --    The variant must be active, non-archived, and its product must be
        --    published, non-archived, and not soft-deleted.
        -- ---------------------------------------------------------------------
        IF NOT EXISTS (
            SELECT 1
            FROM   public.product_variants pv
            JOIN   public.products         p  ON p.id = pv.product_id
            WHERE  pv.id          = v_variant_id
              AND  pv.status      = 'active'
              AND  pv.archived_at IS NULL
              AND  p.status       = 'published'
              AND  p.archived_at  IS NULL
              AND  p.deleted_at   IS NULL
        ) THEN
            RAISE EXCEPTION 'INVALID_VARIANT:variant=% is not active or its product is not published/available',
                v_variant_id;
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
        -- The trigger (trigger_update_inventory_reserved_quantity) fires AFTER
        -- this INSERT and recalculates inventory_records.reserved_quantity from
        -- the SUM of all active, non-expired reservations.
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

-- Grants are unchanged: the ownership check inside the function provides
-- the necessary authorization boundary for authenticated callers.
REVOKE EXECUTE ON FUNCTION public.reserve_inventory_items(uuid, jsonb, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_inventory_items(uuid, jsonb, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_inventory_items(uuid, jsonb, int) TO service_role;
