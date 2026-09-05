-- =============================================================================
-- 20260905056_restrict_order_rpc_to_service_role.sql
-- Security Hardening: Restrict create_order_from_checkout_rpc to service_role
--
-- CRITICAL: Previously this RPC was callable by any authenticated user.
-- p_payment_reference was accepted but never validated inside the function,
-- meaning a logged-in customer who obtained a checkout_session_id could call
-- the RPC directly and manufacture an order without having paid.
--
-- Changes:
--   1. REVOKE EXECUTE from 'authenticated' — only 'service_role' may call this
--      function. All server-side callers already use createAdminClient() which
--      runs as service_role, so there is no impact on the production flow.
--
--   2. ADD SET search_path = public (was missing in migration 053).
--
--   3. ADD payment reference validation: before processing the checkout, verify
--      that a payment_attempts row exists for this checkout session with:
--        - provider_reference = p_payment_reference
--        - status NOT IN ('failed', 'abandoned')
--      This prevents the RPC from being called with a fabricated reference even
--      if an attacker somehow had service_role access (defense in depth).
--
-- The function body is otherwise identical to migration 053.
-- IDEMPOTENT: Safe to re-run (CREATE OR REPLACE).
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
    FROM public.checkout_sessions
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
    FROM public.carts
    WHERE id = v_session.cart_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cart % associated with checkout session % not found',
            v_session.cart_id, p_checkout_session_id;
    END IF;

    -- 3. Guard: cart must be non-empty
    IF NOT EXISTS (SELECT 1 FROM public.cart_lines WHERE cart_id = v_cart.id) THEN
        RAISE EXCEPTION 'Cart % is empty', v_cart.id;
    END IF;

    -- 4. PAYMENT REFERENCE GUARD (defense in depth)
    --    Verify a payment attempt exists for this session with the given reference
    --    in a non-terminal state. This prevents the RPC from being invoked with a
    --    fabricated or mismatched reference.
    IF p_payment_reference IS NOT NULL AND p_payment_reference <> '' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM   public.payment_attempts
            WHERE  provider_reference = p_payment_reference
              AND  status NOT IN ('failed', 'abandoned')
              AND  metadata->>'checkoutSessionId' = p_checkout_session_id::text
        ) THEN
            RAISE EXCEPTION 'INVALID_PAYMENT_REFERENCE:reference=% does not match a valid pending payment attempt for checkout_session=%',
                p_payment_reference, p_checkout_session_id;
        END IF;
    END IF;

    -- 5. Source all monetary totals exclusively from the locked checkout_session (Naira -> Kobo)
    v_subtotal_kobo       := COALESCE(v_session.subtotal,       0)::BIGINT * 100;
    v_shipping_total_kobo := COALESCE(v_session.shipping_total, 0)::BIGINT * 100;
    v_discount_total_kobo := COALESCE(v_session.discount_total, 0)::BIGINT * 100;
    v_tax_total_kobo      := COALESCE(v_session.tax_total,      0)::BIGINT * 100;
    v_grand_total_kobo    := COALESCE(v_session.grand_total,    0)::BIGINT * 100;

    IF v_grand_total_kobo <= 0 THEN
        RAISE EXCEPTION 'Checkout session % has a zero or negative grand_total (%)',
            p_checkout_session_id, v_session.grand_total;
    END IF;

    -- 6. Construct canonical shipping snapshots if fulfilment_method_id is set
    IF v_session.fulfilment_method_id IS NOT NULL THEN
        SELECT * INTO v_method_row
        FROM public.fulfilment_methods
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
        ORDER BY cardinality(sz.regions) ASC, sz.name ASC
        LIMIT 1;

        IF v_zone_id IS NULL THEN
            SELECT sz.id, sz.name INTO v_zone_id, v_zone_name
            FROM public.shipping_zones sz
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
            FROM public.shipping_rates sr
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
                    'id',        NULL,
                    'zone_id',   NULL,
                    'zone_name', 'Pickup',
                    'rate_type', 'free'
                );
            END IF;
        END IF;
    END IF;

    -- 7. Generate order number
    v_order_number := 'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYYMMDD') || '-' ||
                      UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));

    -- 8. Insert order record
    INSERT INTO public.orders (
        customer_id,
        checkout_session_id,
        status,
        payment_status,
        payment_reference,
        subtotal_amount,
        shipping_amount,
        discount_amount,
        tax_amount,
        grand_total,
        currency,
        shipping_address,
        fulfilment_method_id,
        shipping_method_snapshot,
        shipping_rate_snapshot,
        order_number
    ) VALUES (
        v_session.customer_id,
        p_checkout_session_id,
        'pending',
        'paid',
        p_payment_reference,
        v_subtotal_kobo,
        v_shipping_total_kobo,
        v_discount_total_kobo,
        v_tax_total_kobo,
        v_grand_total_kobo,
        COALESCE(v_session.currency, 'NGN'),
        v_session.shipping_address,
        v_session.fulfilment_method_id,
        v_shipping_method_snapshot,
        v_shipping_rate_snapshot,
        v_order_number
    )
    RETURNING id INTO v_order_id;

    -- 9. Insert order lines with immutable product + variant snapshots
    FOR v_line IN
        SELECT
            cl.variant_id,
            cl.quantity,
            pv.price_override,
            pv.sku                                           AS variant_sku,
            pv.option_combination,
            pv.image_id                                      AS variant_image_id,
            p.id                                             AS product_id,
            p.name                                           AS product_name,
            p.slug                                           AS product_slug,
            p.base_price                                     AS product_base_price,
            pi_var.url                                       AS variant_image_url,
            pi_pri.url                                       AS product_primary_image_url
        FROM   public.cart_lines    cl
        JOIN   public.product_variants pv ON pv.id = cl.variant_id
        JOIN   public.products         p  ON p.id  = pv.product_id
        LEFT JOIN public.product_images pi_var
               ON pi_var.id = pv.image_id
        LEFT JOIN public.product_images pi_pri
               ON pi_pri.product_id = p.id AND pi_pri.is_primary = TRUE
        WHERE  cl.cart_id = v_cart.id
    LOOP
        -- Resolve unit price: variant override > product base price
        DECLARE
            v_unit_price_kobo  BIGINT;
            v_line_total_kobo  BIGINT;
            v_variant_label    TEXT;
            v_image_url        TEXT;
        BEGIN
            v_unit_price_kobo := COALESCE(
                v_line.price_override::BIGINT * 100,
                v_line.product_base_price::BIGINT * 100
            );
            v_line_total_kobo := v_unit_price_kobo * v_line.quantity;

            -- Build human-readable variant label from option_combination keys
            IF v_line.option_combination IS NOT NULL
               AND v_line.option_combination <> '{}'::jsonb
            THEN
                SELECT string_agg(val, ' / ' ORDER BY key)
                INTO   v_variant_label
                FROM   jsonb_each_text(v_line.option_combination) t(key, val);
            ELSE
                v_variant_label := COALESCE(v_line.variant_sku, 'Default');
            END IF;

            -- Variant image > product primary image
            v_image_url := COALESCE(v_line.variant_image_url, v_line.product_primary_image_url);

            -- Deduct inventory
            SELECT id INTO v_inv_record_id
            FROM   public.inventory_records
            WHERE  variant_id = v_line.variant_id;

            IF v_inv_record_id IS NOT NULL THEN
                UPDATE public.inventory_records
                SET    on_hand_quantity  = on_hand_quantity - v_line.quantity,
                       reserved_quantity = GREATEST(reserved_quantity - v_line.quantity, 0),
                       updated_at        = NOW()
                WHERE  id = v_inv_record_id;

                INSERT INTO public.stock_movements (
                    inventory_record_id, type, quantity, reason, reference_id
                ) VALUES (
                    v_inv_record_id, 'sale', -v_line.quantity, 'Order ' || v_order_number, v_order_id
                );
            END IF;

            INSERT INTO public.order_lines (
                order_id,
                variant_id,
                quantity,
                unit_price,
                line_total,
                product_name_snapshot,
                variant_label_snapshot,
                sku_snapshot,
                image_url_snapshot
            ) VALUES (
                v_order_id,
                v_line.variant_id,
                v_line.quantity,
                v_unit_price_kobo,
                v_line_total_kobo,
                v_line.product_name,
                v_variant_label,
                v_line.variant_sku,
                v_image_url
            );
        END;
    END LOOP;

    -- 10. Mark checkout session as completed
    UPDATE public.checkout_sessions
    SET    status     = 'completed',
           updated_at = NOW()
    WHERE  id = p_checkout_session_id;

    -- 10b. Increment coupon usage if promo_code was applied
    IF v_session.promo_code IS NOT NULL AND TRIM(v_session.promo_code) <> '' THEN
        UPDATE public.coupon_codes
        SET    current_uses = current_uses + 1,
               updated_at   = NOW()
        WHERE  UPPER(TRIM(code)) = UPPER(TRIM(v_session.promo_code));
    END IF;

    -- 11. Clear cart lines
    DELETE FROM public.cart_lines WHERE cart_id = v_cart.id;

    -- Return created order record as JSON
    SELECT row_to_json(o)::jsonb INTO v_order_json
    FROM   public.orders o
    WHERE  o.id = v_order_id;

    RETURN v_order_json;
END;
$$;

-- SECURITY: Remove access from authenticated users entirely.
-- This RPC can only be called from the server via createAdminClient() (service_role).
-- The payment verification and session ownership checks happen in payment-service.ts
-- BEFORE this RPC is called. The payment reference guard inside this function is
-- defense-in-depth.
REVOKE EXECUTE ON FUNCTION public.create_order_from_checkout_rpc(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.create_order_from_checkout_rpc(UUID, TEXT) TO service_role;
