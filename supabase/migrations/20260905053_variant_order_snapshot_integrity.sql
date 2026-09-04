-- =============================================================================
-- 20260905053_variant_order_snapshot_integrity.sql
--
-- Variant Commerce Remediation: Order Line Snapshot Integrity
--
-- 1. Populates variant_label_snapshot with formatted combination values
--    (e.g. 'White / 42' or 'Red / Small') when option_combination is non-empty,
--    falling back to sku, then 'Default'.
-- 2. Snapshots variant-specific image if present (pv.image_id), falling back
--    to primary product image.
-- 3. Preserves all existing checkout lock, coupon increment, shipping snapshot,
--    inventory deduction, and reservation conversion logic.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_order_from_checkout_rpc(
    p_checkout_session_id UUID,
    p_payment_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session               RECORD;
    v_cart                  RECORD;
    v_order_id              UUID;
    v_order_number          TEXT;
    v_subtotal_kobo         BIGINT;
    v_shipping_total_kobo   BIGINT;
    v_discount_total_kobo   BIGINT;
    v_tax_total_kobo        BIGINT;
    v_grand_total_kobo      BIGINT;
    v_line                  RECORD;
    v_order_json            JSONB;
    v_shipping_method_snapshot JSONB := NULL;
    v_shipping_rate_snapshot   JSONB := NULL;
    v_method_row            RECORD;
    v_rate_row              RECORD;
    v_zone_id               UUID    := NULL;
    v_zone_name             TEXT    := NULL;
    v_state                 TEXT    := '';
    v_city                  TEXT    := '';
    v_inv_record_id         UUID    := NULL;
BEGIN
    -- 1. Fetch & lock checkout session
    SELECT * INTO v_session
    FROM checkout_sessions
    WHERE id = p_checkout_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Checkout session % not found', p_checkout_session_id;
    END IF;

    IF v_session.status = 'completed' THEN
        RAISE EXCEPTION 'Checkout session % has already been completed', p_checkout_session_id;
    END IF;

    -- 2. Fetch & lock cart
    SELECT * INTO v_cart
    FROM carts
    WHERE id = v_session.cart_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cart % associated with checkout session % not found',
            v_session.cart_id, p_checkout_session_id;
    END IF;

    -- 3. Guard: cart must be non-empty
    IF NOT EXISTS (SELECT 1 FROM cart_lines WHERE cart_id = v_cart.id) THEN
        RAISE EXCEPTION 'Cart % is empty', v_cart.id;
    END IF;

    -- 4. Source all monetary totals exclusively from the locked checkout_session (Naira -> Kobo)
    v_subtotal_kobo       := COALESCE(v_session.subtotal,       0)::BIGINT * 100;
    v_shipping_total_kobo := COALESCE(v_session.shipping_total, 0)::BIGINT * 100;
    v_discount_total_kobo := COALESCE(v_session.discount_total, 0)::BIGINT * 100;
    v_tax_total_kobo      := COALESCE(v_session.tax_total,      0)::BIGINT * 100;
    v_grand_total_kobo      := COALESCE(v_session.grand_total,    0)::BIGINT * 100;

    IF v_grand_total_kobo <= 0 THEN
        RAISE EXCEPTION 'Checkout session % has a zero or negative grand_total (%)',
            p_checkout_session_id, v_session.grand_total;
    END IF;

    -- 5. Construct canonical shipping snapshots if fulfilment_method_id is set
    IF v_session.fulfilment_method_id IS NOT NULL THEN
        SELECT * INTO v_method_row
        FROM fulfilment_methods
        WHERE id = v_session.fulfilment_method_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Fulfilment method % configured on checkout session % not found',
                v_session.fulfilment_method_id, p_checkout_session_id;
        END IF;

        v_shipping_method_snapshot := jsonb_build_object(
            'id',                  v_method_row.id,
            'type',                v_method_row.type,
            'name',                v_method_row.name,
            'description',         v_method_row.description,
            'estimated_days_min',  v_method_row.estimated_days_min,
            'estimated_days_max',  v_method_row.estimated_days_max
        );

        IF v_session.shipping_address IS NOT NULL THEN
            v_state := LOWER(TRIM(COALESCE(v_session.shipping_address->>'state', '')));
            v_city  := LOWER(TRIM(COALESCE(v_session.shipping_address->>'city',  '')));
        END IF;

        SELECT sz.id, sz.name INTO v_zone_id, v_zone_name
        FROM shipping_zones sz
        WHERE EXISTS (
            SELECT 1
            FROM unnest(sz.regions) r
            WHERE LOWER(TRIM(r)) NOT IN ('nationwide', '*', 'all')
              AND (
                (v_state <> '' AND (LOWER(TRIM(r)) = v_state OR v_state LIKE '%' || LOWER(TRIM(r)) || '%' OR LOWER(TRIM(r)) LIKE '%' || v_state || '%'))
                OR (v_city  <> '' AND (LOWER(TRIM(r)) = v_city  OR v_city  LIKE '%' || LOWER(TRIM(r)) || '%' OR LOWER(TRIM(r)) LIKE '%' || v_city  || '%'))
              )
        )
        ORDER BY cardinality(sz.regions) ASC, sz.name ASC
        LIMIT 1;

        IF v_zone_id IS NULL THEN
            SELECT sz.id, sz.name INTO v_zone_id, v_zone_name
            FROM shipping_zones sz
            WHERE EXISTS (
                SELECT 1
                FROM unnest(sz.regions) r
                WHERE LOWER(TRIM(r)) IN ('nationwide', '*', 'all')
            )
            ORDER BY sz.name ASC
            LIMIT 1;
        END IF;

        IF v_zone_id IS NOT NULL THEN
            SELECT sr.*, v_zone_name AS zone_name
            INTO v_rate_row
            FROM shipping_rates sr
            WHERE sr.fulfilment_method_id = v_session.fulfilment_method_id
              AND sr.zone_id = v_zone_id;
        END IF;

        IF v_rate_row.id IS NOT NULL THEN
            v_shipping_rate_snapshot := jsonb_build_object(
                'id',                     v_rate_row.id,
                'zone_id',                v_rate_row.zone_id,
                'zone_name',              v_zone_name,
                'rate_type',              v_rate_row.rate_type,
                'flat_amount',            v_rate_row.flat_amount,
                'per_kg_amount',          v_rate_row.per_kg_amount,
                'free_above_order_total', v_rate_row.free_above_order_total
            );
        ELSE
            IF (v_method_row.type IN ('pickup', 'local_pickup') OR LOWER(v_method_row.name) LIKE '%pickup%')
               AND v_session.shipping_total = 0
            THEN
                v_shipping_rate_snapshot := jsonb_build_object(
                    'rate_type',              'flat',
                    'flat_amount',            0,
                    'per_kg_amount',          0,
                    'free_above_order_total', NULL,
                    'note',                   'Store Pickup'
                );
            ELSE
                RAISE EXCEPTION
                    'Applicable shipping rate for fulfilment method % and destination state % not found',
                    v_session.fulfilment_method_id, v_state;
            END IF;
        END IF;
    END IF;

    -- 6. Generate order number
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');

    -- 7. Create Order
    INSERT INTO orders (
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

    -- 8. Insert Order Lines with variant label & image snapshot & deduct stock
    FOR v_line IN (
        SELECT cl.*, pv.sku, p.name AS product_name,
               COALESCE(
                   (SELECT pi.url FROM product_images pi WHERE pi.id = pv.image_id LIMIT 1),
                   (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.created_at ASC LIMIT 1)
               ) AS product_image_url,
               COALESCE(
                   NULLIF((SELECT string_agg(val, ' / ' ORDER BY key) FROM jsonb_each_text(pv.option_combination) AS t(key, val)), ''),
                   v_line.sku,
                   'Default'
               ) AS formatted_variant_label
        FROM cart_lines cl
        JOIN product_variants pv ON pv.id = cl.variant_id
        JOIN products p ON p.id = pv.product_id
        WHERE cl.cart_id = v_cart.id
    ) LOOP
        INSERT INTO order_lines (
            order_id,
            variant_id,
            product_name_snapshot,
            variant_label_snapshot,
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
            v_line.sku,
            v_line.product_image_url,
            v_line.unit_price_snapshot,
            v_line.quantity,
            v_line.unit_price_snapshot * v_line.quantity
        );

        -- Find inventory record for this variant
        SELECT id INTO v_inv_record_id
        FROM inventory_records
        WHERE variant_id = v_line.variant_id;

        -- Deduct inventory on hand and release reservation
        IF v_inv_record_id IS NOT NULL THEN
            UPDATE inventory_records
            SET on_hand_quantity  = GREATEST(0, on_hand_quantity  - v_line.quantity),
                reserved_quantity = GREATEST(0, reserved_quantity - v_line.quantity),
                updated_at        = NOW()
            WHERE id = v_inv_record_id;

            -- Log stock movement
            INSERT INTO stock_movements (
                inventory_record_id,
                movement_type,
                quantity_delta,
                reference_id,
                reason
            ) VALUES (
                v_inv_record_id,
                'outbound',
                -v_line.quantity,
                v_order_id,
                'Order fulfillment sale'
            );
        END IF;
    END LOOP;

    -- 9. Update inventory reservations status to converted
    UPDATE inventory_reservations
    SET status = 'converted'
    WHERE checkout_session_id = p_checkout_session_id;

    -- 10. Mark checkout session completed
    UPDATE checkout_sessions
    SET status     = 'completed',
        updated_at = NOW()
    WHERE id = p_checkout_session_id;

    -- 10b. Increment coupon usage if promo_code was applied
    IF v_session.promo_code IS NOT NULL AND TRIM(v_session.promo_code) <> '' THEN
        UPDATE coupon_codes
        SET current_uses = current_uses + 1,
            updated_at   = NOW()
        WHERE UPPER(TRIM(code)) = UPPER(TRIM(v_session.promo_code));
    END IF;

    -- 11. Clear cart lines
    DELETE FROM cart_lines WHERE cart_id = v_cart.id;

    -- Return created order record as JSON
    SELECT row_to_json(o)::jsonb INTO v_order_json
    FROM orders o
    WHERE o.id = v_order_id;

    RETURN v_order_json;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_order_from_checkout_rpc(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_order_from_checkout_rpc(UUID, TEXT) TO authenticated, service_role;
