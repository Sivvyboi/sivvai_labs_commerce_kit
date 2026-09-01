-- =============================================================================
-- 20260901041_create_promotion_rpc.sql
-- Atomic PL/pgSQL function to create a Promotion and its primary Coupon Code.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_promotion_with_coupon_rpc(
    p_name TEXT,
    p_type TEXT,
    p_value money_amount,
    p_code TEXT,
    p_max_uses inventory_quantity DEFAULT NULL,
    p_starts_at TIMESTAMPTZ DEFAULT NULL,
    p_ends_at TIMESTAMPTZ DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_code TEXT;
    v_promo RECORD;
    v_coupon RECORD;
BEGIN
    -- 1. Validate required inputs
    IF p_name IS NULL OR TRIM(p_name) = '' THEN
        RAISE EXCEPTION 'Promotion name is required';
    END IF;

    IF p_type NOT IN ('percentage', 'fixed_amount') THEN
        RAISE EXCEPTION 'Invalid promotion type: %', p_type;
    END IF;

    IF p_value <= 0 THEN
        RAISE EXCEPTION 'Promotion value must be positive';
    END IF;

    IF p_type = 'percentage' AND p_value > 100 THEN
        RAISE EXCEPTION 'Percentage discount cannot exceed 100';
    END IF;

    v_clean_code := UPPER(TRIM(p_code));
    IF v_clean_code IS NULL OR LENGTH(v_clean_code) < 3 THEN
        RAISE EXCEPTION 'Coupon code must be at least 3 characters';
    END IF;

    -- 2. Insert promotion record
    INSERT INTO promotions (
        name,
        type,
        value,
        starts_at,
        ends_at,
        is_active
    ) VALUES (
        TRIM(p_name),
        p_type,
        p_value,
        p_starts_at,
        p_ends_at,
        COALESCE(p_is_active, TRUE)
    )
    RETURNING * INTO v_promo;

    -- 3. Insert primary coupon code
    -- Any unique constraint violation (e.g. coupon_codes_code_key) aborts the transaction
    -- and rolls back the promotion insert atomically.
    INSERT INTO coupon_codes (
        promotion_id,
        code,
        max_uses,
        current_uses
    ) VALUES (
        v_promo.id,
        v_clean_code,
        p_max_uses,
        0
    )
    RETURNING * INTO v_coupon;

    -- 4. Return combined JSON object matching PromotionWithCoupon shape
    RETURN jsonb_build_object(
        'id', v_promo.id,
        'name', v_promo.name,
        'type', v_promo.type,
        'value', v_promo.value,
        'starts_at', v_promo.starts_at,
        'ends_at', v_promo.ends_at,
        'is_active', v_promo.is_active,
        'created_at', v_promo.created_at,
        'updated_at', v_promo.updated_at,
        'coupon_codes', jsonb_build_array(
            jsonb_build_object(
                'id', v_coupon.id,
                'promotion_id', v_coupon.promotion_id,
                'code', v_coupon.code,
                'max_uses', v_coupon.max_uses,
                'current_uses', v_coupon.current_uses,
                'created_at', v_coupon.created_at,
                'updated_at', v_coupon.updated_at
            )
        )
    );
END;
$$;

-- Revoke public access, allow authenticated and service_role execution
REVOKE EXECUTE ON FUNCTION create_promotion_with_coupon_rpc(TEXT, TEXT, money_amount, TEXT, inventory_quantity, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_promotion_with_coupon_rpc(TEXT, TEXT, money_amount, TEXT, inventory_quantity, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) TO authenticated, service_role;
