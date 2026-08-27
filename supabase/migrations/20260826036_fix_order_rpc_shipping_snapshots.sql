-- =============================================================================
-- 20260826036_fix_order_rpc_shipping_snapshots.sql
-- Fix create_order_from_checkout_rpc to properly construct JSONB shipping snapshots,
-- preserve Phase B zone resolution semantics, and align stock_movements column names.
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
    v_session RECORD;
    v_cart RECORD;
    v_order_id UUID;
    v_order_number TEXT;
    v_subtotal INTEGER := 0;
    v_line RECORD;
    v_order_json JSONB;
    v_shipping_method_snapshot JSONB := NULL;
    v_shipping_rate_snapshot JSONB := NULL;
    v_method_row RECORD;
    v_rate_row RECORD;
    v_zone_id UUID := NULL;
    v_zone_name TEXT := NULL;
    v_state TEXT := '';
    v_city TEXT := '';
    v_inv_record_id UUID := NULL;
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

    -- 2. Fetch cart
    SELECT * INTO v_cart
    FROM carts
    WHERE id = v_session.cart_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cart % not found for checkout session', v_session.cart_id;
    END IF;

    -- 3. Calculate order subtotal from cart lines
    SELECT COALESCE(SUM(unit_price_snapshot * quantity), 0) INTO v_subtotal
    FROM cart_lines
    WHERE cart_id = v_cart.id;

    IF v_subtotal <= 0 THEN
        RAISE EXCEPTION 'Cart % is empty', v_cart.id;
    END IF;

    -- 4. Construct canonical shipping snapshots if fulfilment_method_id is set
    IF v_session.fulfilment_method_id IS NOT NULL THEN
        -- 4a. Fetch fulfilment method
        SELECT * INTO v_method_row
        FROM fulfilment_methods
        WHERE id = v_session.fulfilment_method_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Fulfilment method % configured on checkout session % not found', v_session.fulfilment_method_id, p_checkout_session_id;
        END IF;

        v_shipping_method_snapshot := jsonb_build_object(
            'id', v_method_row.id,
            'type', v_method_row.type,
            'name', v_method_row.name,
            'description', v_method_row.description,
            'estimated_days_min', v_method_row.estimated_days_min,
            'estimated_days_max', v_method_row.estimated_days_max
        );

        -- 4b. Extract destination state and city for zone matching
        IF v_session.shipping_address IS NOT NULL THEN
            v_state := LOWER(TRIM(COALESCE(v_session.shipping_address->>'state', '')));
            v_city := LOWER(TRIM(COALESCE(v_session.shipping_address->>'city', '')));
        END IF;

        -- 4c. Match shipping zone using Phase B deterministic specificity:
        -- Direct region match takes precedence (zone with fewer regions is most specific)
        SELECT sz.id, sz.name INTO v_zone_id, v_zone_name
        FROM shipping_zones sz
        WHERE EXISTS (
            SELECT 1
            FROM unnest(sz.regions) r
            WHERE LOWER(TRIM(r)) NOT IN ('nationwide', '*', 'all')
              AND (
                (v_state <> '' AND (LOWER(TRIM(r)) = v_state OR v_state LIKE '%' || LOWER(TRIM(r)) || '%' OR LOWER(TRIM(r)) LIKE '%' || v_state || '%'))
                OR (v_city <> '' AND (LOWER(TRIM(r)) = v_city OR v_city LIKE '%' || LOWER(TRIM(r)) || '%' OR LOWER(TRIM(r)) LIKE '%' || v_city || '%'))
              )
        )
        ORDER BY cardinality(sz.regions) ASC, sz.name ASC
        LIMIT 1;

        -- Fallback to Nationwide / wildcard zone if configured by admin
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

        -- 4d. Match shipping rate for method and zone
        IF v_zone_id IS NOT NULL THEN
            SELECT sr.*, v_zone_name AS zone_name
            INTO v_rate_row
            FROM shipping_rates sr
            WHERE sr.fulfilment_method_id = v_session.fulfilment_method_id
              AND sr.zone_id = v_zone_id;
        END IF;

        IF v_rate_row.id IS NOT NULL THEN
            v_shipping_rate_snapshot := jsonb_build_object(
                'id', v_rate_row.id,
                'zone_id', v_rate_row.zone_id,
                'zone_name', v_zone_name,
                'rate_type', v_rate_row.rate_type,
                'flat_amount', v_rate_row.flat_amount,
                'per_kg_amount', v_rate_row.per_kg_amount,
                'free_above_order_total', v_rate_row.free_above_order_total
            );
        ELSE
            -- Handle Store Pickup methods (which have ₦0 cost without an explicit rate row in shipping_rates)
            IF (v_method_row.type IN ('pickup', 'local_pickup') OR LOWER(v_method_row.name) LIKE '%pickup%') AND v_session.shipping_total = 0 THEN
                v_shipping_rate_snapshot := jsonb_build_object(
                    'rate_type', 'flat',
                    'flat_amount', 0,
                    'per_kg_amount', 0,
                    'free_above_order_total', NULL,
                    'note', 'Store Pickup'
                );
            ELSE
                RAISE EXCEPTION 'Applicable shipping rate for fulfilment method % and destination state % not found', v_session.fulfilment_method_id, v_state;
            END IF;
        END IF;
    END IF;

    -- 5. Generate order number
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');

    -- 6. Create Order
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
        v_subtotal,
        v_session.shipping_total,
        v_session.discount_total,
        v_session.tax_total,
        GREATEST(0, v_subtotal + v_session.shipping_total - v_session.discount_total),
        COALESCE(v_session.currency, 'NGN')
    )
    RETURNING id INTO v_order_id;

    -- 7. Insert Order Lines & deduct stock
    FOR v_line IN (
        SELECT cl.*, pv.sku, p.name AS product_name
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
            COALESCE(v_line.sku, 'Default'),
            v_line.sku,
            NULL,
            v_line.unit_price_snapshot,
            v_line.quantity,
            v_line.unit_price_snapshot * v_line.quantity
        );

        -- Find inventory record for variant
        SELECT id INTO v_inv_record_id
        FROM inventory_records
        WHERE variant_id = v_line.variant_id;

        -- Deduct inventory on hand and release reservation
        IF v_inv_record_id IS NOT NULL THEN
            UPDATE inventory_records
            SET on_hand_quantity = GREATEST(0, on_hand_quantity - v_line.quantity),
                reserved_quantity = GREATEST(0, reserved_quantity - v_line.quantity),
                updated_at = NOW()
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

    -- 8. Update reservations status to converted
    UPDATE inventory_reservations
    SET status = 'converted'
    WHERE checkout_session_id = p_checkout_session_id;

    -- 9. Mark checkout session completed
    UPDATE checkout_sessions
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_checkout_session_id;

    -- 10. Clear cart lines
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
