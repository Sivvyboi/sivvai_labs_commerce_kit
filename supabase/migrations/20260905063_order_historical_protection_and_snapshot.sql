-- =============================================================================
-- 20260905063_order_historical_protection_and_snapshot.sql
-- Orders Domain: Historical Commerce Protection & Order Line Snapshot Integrity
--
-- 1. Adds selected_options_snapshot (JSONB) to order_lines and backfills it.
-- 2. Updates create_order_from_checkout_rpc to snapshot selected_options_snapshot
--    from variant option_combination, guaranteeing immutable representation.
-- 3. Adds triggers on products and product_variants preventing physical deletion
--    if any associated variant has historical orders.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add selected_options_snapshot column to order_lines & backfill
-- ---------------------------------------------------------------------------
ALTER TABLE public.order_lines
    ADD COLUMN IF NOT EXISTS selected_options_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill from product_variants
UPDATE public.order_lines ol
SET selected_options_snapshot = COALESCE(pv.option_combination, '{}'::jsonb)
FROM public.product_variants pv
WHERE ol.variant_id = pv.id
  AND (ol.selected_options_snapshot IS NULL OR ol.selected_options_snapshot = '{}'::jsonb);

-- ---------------------------------------------------------------------------
-- 2. Anti-Destructive Deletion Triggers for Historical Orders
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_destructive_product_deletion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.order_lines ol
        JOIN public.product_variants pv ON pv.id = ol.variant_id
        WHERE pv.product_id = OLD.id
    ) THEN
        RAISE EXCEPTION 'CANNOT_DELETE_HISTORICAL_COMMERCE: Product % has recorded historical orders and cannot be physically deleted. Archive or soft-delete instead.', OLD.id;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_destructive_product_deletion ON public.products;
CREATE TRIGGER trigger_prevent_destructive_product_deletion
    BEFORE DELETE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_destructive_product_deletion();

CREATE OR REPLACE FUNCTION public.prevent_destructive_variant_deletion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.order_lines ol
        WHERE ol.variant_id = OLD.id
    ) THEN
        RAISE EXCEPTION 'CANNOT_DELETE_HISTORICAL_COMMERCE: Variant % has recorded historical orders and cannot be physically deleted. Deactivate or archive instead.', OLD.id;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_destructive_variant_deletion ON public.product_variants;
CREATE TRIGGER trigger_prevent_destructive_variant_deletion
    BEFORE DELETE ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_destructive_variant_deletion();

-- ---------------------------------------------------------------------------
-- 3. Update create_order_from_checkout_rpc with selected_options_snapshot
-- ---------------------------------------------------------------------------
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
    v_inv_record_id            UUID  := NULL;
BEGIN
    -- 1. Validate payment reference
    IF p_payment_reference IS NULL OR TRIM(p_payment_reference) = '' THEN
        RAISE EXCEPTION 'INVALID_PAYMENT_REFERENCE: A valid provider payment reference is required to create an order';
    END IF;

    -- 2. Verify payment attempt exists and is not failed/abandoned
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

    IF FOUND THEN
        IF v_payment_attempt.status IN ('failed', 'abandoned') THEN
            RAISE EXCEPTION 'INVALID_PAYMENT_STATE: Payment attempt % is in status %, cannot create order',
                v_payment_attempt.id, v_payment_attempt.status;
        END IF;
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

        -- Find inventory record for this variant
        SELECT id INTO v_inv_record_id
        FROM public.inventory_records
        WHERE variant_id = v_line.variant_id;

        -- Deduct inventory on hand and release reservation
        IF v_inv_record_id IS NOT NULL THEN
            UPDATE public.inventory_records
            SET on_hand_quantity  = GREATEST(0, on_hand_quantity  - v_line.quantity),
                reserved_quantity = GREATEST(0, reserved_quantity - v_line.quantity),
                updated_at        = NOW()
            WHERE id = v_inv_record_id;

            -- Log stock movement
            INSERT INTO public.stock_movements (
                inventory_record_id,
                movement_type,
                quantity_delta,
                reference_id,
                reason
            ) VALUES (
                v_inv_record_id,
                'sale',
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

-- Security restriction: service_role only
REVOKE ALL ON FUNCTION public.create_order_from_checkout_rpc(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_from_checkout_rpc(UUID, TEXT) TO service_role;
