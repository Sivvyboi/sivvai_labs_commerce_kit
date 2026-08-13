-- =============================================================================
-- 20260813031_create_order_rpc.sql
-- Create atomic PL/pgSQL function for order creation from checkout session
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

    -- 4. Generate order number
    v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');

    -- 5. Create Order
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
        NULL,
        v_session.shipping_total,
        v_subtotal,
        v_session.shipping_total,
        v_session.discount_total,
        v_session.tax_total,
        GREATEST(0, v_subtotal + v_session.shipping_total - v_session.discount_total),
        COALESCE(v_session.currency, 'NGN')
    )
    RETURNING id INTO v_order_id;

    -- 6. Insert Order Lines & deduct stock
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

        -- Deduct inventory on hand and release reservation
        UPDATE inventory_records
        SET on_hand_quantity = GREATEST(0, on_hand_quantity - v_line.quantity),
            reserved_quantity = GREATEST(0, reserved_quantity - v_line.quantity),
            updated_at = NOW()
        WHERE variant_id = v_line.variant_id;

        -- Log stock movement
        INSERT INTO stock_movements (
            variant_id,
            quantity_change,
            type,
            reference_id,
            notes
        ) VALUES (
            v_line.variant_id,
            -v_line.quantity,
            'sale',
            v_order_id,
            'Atomic checkout order completion'
        );
    END LOOP;

    -- 7. Update reservations status to converted
    UPDATE inventory_reservations
    SET status = 'converted',
        updated_at = NOW()
    WHERE checkout_session_id = p_checkout_session_id;

    -- 8. Mark checkout session completed
    UPDATE checkout_sessions
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_checkout_session_id;

    -- 9. Clear cart lines
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
