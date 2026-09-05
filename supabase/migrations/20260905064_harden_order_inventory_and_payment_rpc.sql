-- =============================================================================
-- 20260905064_harden_order_inventory_and_payment_rpc.sql
-- Orders & Inventory Domain: Hardened Stock Deduction & Payment Integrity Invariants
--
-- 1. Tightens create_order_from_checkout_rpc inventory deduction:
--    - Locks inventory_records FOR UPDATE.
--    - Eliminates GREATEST(0, ...) clamping: requires on_hand_quantity >= requested,
--      otherwise aborts transaction with INSUFFICIENT_STOCK_FOR_ORDER.
--    - Asserts that active reservation exists for checkout session with sufficient
--      quantity, otherwise aborts with INSUFFICIENT_RESERVATION_FOR_ORDER.
--    - Deducts exact quantity: on_hand_quantity = on_hand_quantity - requested.
--    - Converts reservation state (status = 'converted'), triggering automatic
--      recalculation of reserved_quantity via trigger_update_inventory_reserved_quantity.
-- 2. Hardens payment attempt validation:
--    - Payment attempt must exist for reference.
--    - Must belong to this checkout session.
--    - Must be in active awaiting state (not failed, abandoned, or already confirmed).
--    - Payment attempt amount in kobo must strictly match order grand total in kobo.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_order_from_checkout_rpc(
    p_checkout_session_id UUID,
    p_payment_reference   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session                  RECORD;
    v_cart                     RECORD;
    v_payment_attempt          RECORD;
    v_order_id                 UUID;
    v_order_number             TEXT;
    v_subtotal_kobo            BIGINT;
    v_shipping_total_kobo      BIGINT;
    v_discount_total_kobo      BIGINT;
    v_tax_total_kobo           BIGINT;
    v_grand_total_kobo         BIGINT;
    v_line                     RECORD;
    v_order_json               JSONB;
    v_shipping_method_snapshot JSONB := NULL;
    v_shipping_rate_snapshot   JSONB := NULL;
    v_method_row               RECORD;
    v_rate_row                 RECORD;
    v_zone_id                  UUID  := NULL;
    v_zone_name                TEXT  := NULL;
    v_state                    TEXT  := '';
    v_city                     TEXT  := '';
    v_inv_row                  RECORD;
    v_reserved_for_session     INT   := 0;
BEGIN
    -- 1. Validate payment reference
    IF p_payment_reference IS NULL OR TRIM(p_payment_reference) = '' THEN
        RAISE EXCEPTION 'INVALID_PAYMENT_REFERENCE: A valid provider payment reference is required to create an order';
    END IF;

    -- 2. Verify payment attempt exists and is in an acceptable pending/initiated state
    SELECT * INTO v_payment_attempt
    FROM public.payment_attempts
    WHERE provider_reference = TRIM(p_payment_reference)
    LIMIT 1;

    IF NOT FOUND THEN
        SELECT * INTO v_payment_attempt
        FROM public.payment_attempts
        WHERE id::TEXT = TRIM(p_payment_reference)
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INVALID_PAYMENT_REFERENCE: No payment attempt found for reference %', p_payment_reference;
    END IF;

    IF v_payment_attempt.status IN ('failed', 'abandoned', 'confirmed') THEN
        RAISE EXCEPTION 'INVALID_PAYMENT_STATE: Payment attempt % is in status %, cannot create order',
            v_payment_attempt.id, v_payment_attempt.status;
    END IF;

    -- 3. Lock & validate checkout session
    SELECT * INTO v_session
    FROM public.checkout_sessions
    WHERE id = p_checkout_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Checkout session % not found', p_checkout_session_id;
    END IF;

    IF v_session.status = 'completed' THEN
        RAISE EXCEPTION 'Checkout session % has already been completed', p_checkout_session_id;
    END IF;

    -- 4. Lock & validate cart
    SELECT * INTO v_cart
    FROM public.carts
    WHERE id = v_session.cart_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cart % associated with checkout session % not found',
            v_session.cart_id, p_checkout_session_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.cart_lines WHERE cart_id = v_cart.id) THEN
        RAISE EXCEPTION 'Cart % is empty', v_cart.id;
    END IF;

    -- 5. Totals from checkout session (Naira -> Kobo)
    v_subtotal_kobo       := COALESCE(v_session.subtotal,       0)::BIGINT * 100;
    v_shipping_total_kobo := COALESCE(v_session.shipping_total, 0)::BIGINT * 100;
    v_discount_total_kobo := COALESCE(v_session.discount_total, 0)::BIGINT * 100;
    v_tax_total_kobo      := COALESCE(v_session.tax_total,      0)::BIGINT * 100;
    v_grand_total_kobo    := COALESCE(v_session.grand_total,    0)::BIGINT * 100;

    IF v_grand_total_kobo <= 0 THEN
        RAISE EXCEPTION 'Checkout session % has a zero or negative grand_total (%)',
            p_checkout_session_id, v_session.grand_total;
    END IF;

    -- Verify payment attempt matches checkout session link & amount
    IF (v_payment_attempt.metadata->>'checkoutSessionId') IS NOT NULL
       AND (v_payment_attempt.metadata->>'checkoutSessionId')::uuid <> p_checkout_session_id THEN
        RAISE EXCEPTION 'PAYMENT_SESSION_MISMATCH: Payment attempt belongs to session %, not %',
            v_payment_attempt.metadata->>'checkoutSessionId', p_checkout_session_id;
    END IF;

    IF v_payment_attempt.amount <> v_grand_total_kobo THEN
        RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH: Payment attempt amount % kobo does not match order grand total % kobo',
            v_payment_attempt.amount, v_grand_total_kobo;
    END IF;

    -- 6. Shipping snapshots
    IF v_session.fulfilment_method_id IS NOT NULL THEN
        SELECT * INTO v_method_row
        FROM public.fulfilment_methods
        WHERE id = v_session.fulfilment_method_id;

        IF FOUND THEN
            v_shipping_method_snapshot := jsonb_build_object(
                'id',                 v_method_row.id,
                'type',               v_method_row.type,
                'name',               v_method_row.name,
                'description',        v_method_row.description,
                'estimated_days_min', v_method_row.estimated_days_min,
                'estimated_days_max', v_method_row.estimated_days_max
            );

            IF v_session.shipping_address IS NOT NULL THEN
                v_state := LOWER(TRIM(COALESCE(v_session.shipping_address->>'state', '')));
                v_city  := LOWER(TRIM(COALESCE(v_session.shipping_address->>'city',  '')));
            END IF;

            SELECT sz.id, sz.name INTO v_zone_id, v_zone_name
            FROM public.shipping_zones sz
            WHERE EXISTS (
                SELECT 1
                FROM unnest(sz.regions) r
                WHERE LOWER(TRIM(r)) NOT IN ('nationwide', '*', 'all')
                  AND (
                    (v_state <> '' AND (LOWER(TRIM(r)) = v_state OR v_state LIKE '%' || LOWER(TRIM(r)) || '%' OR LOWER(TRIM(r)) LIKE '%' || v_state || '%'))
                    OR (v_city  <> '' AND (LOWER(TRIM(r)) = v_city  OR v_city  LIKE '%' || LOWER(TRIM(r)) || '%' OR LOWER(TRIM(r)) LIKE '%' || v_city  || '%'))
                  )
            )
            LIMIT 1;

            IF v_zone_id IS NOT NULL THEN
                SELECT * INTO v_rate_row
                FROM public.shipping_rates sr
                WHERE sr.zone_id = v_zone_id
                  AND sr.fulfilment_method_id = v_session.fulfilment_method_id
                LIMIT 1;

                IF FOUND THEN
                    v_shipping_rate_snapshot := jsonb_build_object(
                        'id',          v_rate_row.id,
                        'zone_id',     v_rate_row.zone_id,
                        'zone_name',   v_zone_name,
                        'rate_type',   v_rate_row.rate_type,
                        'amount_kobo', v_shipping_total_kobo
                    );
                END IF;
            END IF;
        END IF;
    END IF;

    -- 7. Generate order number & insert order
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    INSERT INTO public.orders (
        order_number,
        customer_id,
        guest_contact,
        status,
        shipping_address,
        billing_address,
        shipping_method_snapshot,
        shipping_rate_snapshot,
        subtotal,
        shipping_total,
        discount_total,
        tax_total,
        grand_total,
        currency
    ) VALUES (
        v_order_number,
        v_session.customer_id,
        v_session.guest_contact,
        'processing',
        v_session.shipping_address,
        v_session.shipping_address,
        v_shipping_method_snapshot,
        v_shipping_rate_snapshot,
        v_subtotal_kobo,
        v_shipping_total_kobo,
        v_discount_total_kobo,
        v_tax_total_kobo,
        v_grand_total_kobo,
        COALESCE(v_session.currency, 'NGN')
    )
    RETURNING id INTO v_order_id;

    -- 8. Insert order lines with immutable product + variant snapshots
    FOR v_line IN (
        SELECT cl.*, pv.sku, p.name AS product_name,
               pv.option_combination,
               COALESCE(
                   (SELECT pi.url FROM public.product_images pi WHERE pi.id = pv.image_id LIMIT 1),
                   (SELECT pi.url FROM public.product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC LIMIT 1)
               ) AS product_image_url,
               COALESCE(
                   NULLIF((SELECT string_agg(val, ' / ' ORDER BY key) FROM jsonb_each_text(pv.option_combination) AS t(key, val)), ''),
                   pv.sku,
                   'Default'
               ) AS formatted_variant_label
        FROM public.cart_lines cl
        JOIN public.product_variants pv ON pv.id = cl.variant_id
        JOIN public.products p ON p.id = pv.product_id
        WHERE cl.cart_id = v_cart.id
    ) LOOP
        INSERT INTO public.order_lines (
            order_id,
            variant_id,
            product_name_snapshot,
            variant_label_snapshot,
            selected_options_snapshot,
            sku_snapshot,
            image_url_snapshot,
            unit_price_snapshot,
            quantity,
            line_total
        ) VALUES (
            v_order_id,
            v_line.variant_id,
            v_line.product_name,
            v_line.formatted_variant_label,
            COALESCE(v_line.option_combination, '{}'::jsonb),
            v_line.sku,
            v_line.product_image_url,
            v_line.unit_price_snapshot,
            v_line.quantity,
            v_line.unit_price_snapshot * v_line.quantity
        );

        -- 8b. Find and lock inventory record for this variant
        SELECT * INTO v_inv_row
        FROM public.inventory_records
        WHERE variant_id = v_line.variant_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'NO_INVENTORY_RECORD: Variant % has no inventory record', v_line.variant_id;
        END IF;

        IF v_inv_row.track_inventory THEN
            -- Invariant 1: on-hand quantity must be sufficient to fulfill the order
            IF v_inv_row.on_hand_quantity < v_line.quantity THEN
                RAISE EXCEPTION 'INSUFFICIENT_STOCK_FOR_ORDER: Variant % has insufficient on-hand inventory (% < %)',
                    v_line.variant_id, v_inv_row.on_hand_quantity, v_line.quantity;
            END IF;

            -- Invariant 2: Active reservation for this checkout session must exist with sufficient quantity
            SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_for_session
            FROM public.inventory_reservations
            WHERE checkout_session_id = p_checkout_session_id
              AND variant_id = v_line.variant_id
              AND status = 'active';

            IF v_reserved_for_session < v_line.quantity THEN
                RAISE EXCEPTION 'INSUFFICIENT_RESERVATION_FOR_ORDER: Variant % has insufficient active reservation (% < %) for session %',
                    v_line.variant_id, v_reserved_for_session, v_line.quantity, p_checkout_session_id;
            END IF;

            -- Deduct exact quantity from on_hand_quantity (strictly no clamping)
            UPDATE public.inventory_records
            SET on_hand_quantity = on_hand_quantity - v_line.quantity,
                updated_at       = NOW()
            WHERE id = v_inv_row.id;

            -- Convert active reservation to 'converted'
            -- This cleanly fires trigger_update_inventory_reserved_quantity to accurately recalculate reserved_quantity
            UPDATE public.inventory_reservations
            SET status = 'converted'
            WHERE checkout_session_id = p_checkout_session_id
              AND variant_id = v_line.variant_id
              AND status = 'active';

            -- Log stock movement
            INSERT INTO public.stock_movements (
                inventory_record_id,
                movement_type,
                quantity_delta,
                reference_id,
                reason
            ) VALUES (
                v_inv_row.id,
                'outbound',
                -v_line.quantity,
                v_order_id,
                'Order ' || v_order_number || ' completed'
            );
        END IF;
    END LOOP;

    -- 9. Update checkout session status
    UPDATE public.checkout_sessions
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_checkout_session_id;

    -- 10. Increment coupon usage if promo_code was used
    IF v_session.promo_code IS NOT NULL AND TRIM(v_session.promo_code) <> '' THEN
        UPDATE public.coupon_codes
        SET times_used = times_used + 1,
            updated_at = NOW()
        WHERE code = UPPER(TRIM(v_session.promo_code));
    END IF;

    -- 11. Initial status event
    INSERT INTO public.order_status_events (
        order_id,
        from_status,
        to_status,
        actor,
        note
    ) VALUES (
        v_order_id,
        'draft',
        'processing',
        'system',
        'Order created from completed checkout session'
    );

    SELECT to_jsonb(o.*) INTO v_order_json
    FROM public.orders o
    WHERE o.id = v_order_id;

    RETURN v_order_json;
END;
$$;

-- Security: Restrict create_order_from_checkout_rpc strictly to service_role
REVOKE EXECUTE ON FUNCTION public.create_order_from_checkout_rpc(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_from_checkout_rpc(UUID, TEXT) TO service_role;
