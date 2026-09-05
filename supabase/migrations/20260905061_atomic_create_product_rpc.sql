-- =============================================================================
-- 20260905061_atomic_create_product_rpc.sql
-- Catalog Domain: Atomic Product + Default Variant + Inventory Creation RPC
--
-- Replaces multi-step application-level product creation with a single-transaction
-- database RPC. Guarantees that:
--   1. The base product row in `products`
--   2. The default variant in `product_variants` (is_default: true, status: 'active')
--   3. The companion `inventory_records` row with initial stock
-- are created atomically. If any component fails, the entire transaction rolls back.
--
-- Security:
--   - SECURITY DEFINER with fixed search_path = public
--   - Revoked from public/anon/authenticated; granted to service_role ONLY.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_product_admin_rpc(
    p_product       jsonb,
    p_initial_stock integer DEFAULT 0,
    p_sku           text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product_id    uuid;
    v_slug          text;
    v_sku           text;
    v_variant_id    uuid;
    v_product_row   RECORD;
    v_stock         integer := COALESCE(p_initial_stock, 0);
BEGIN
    -- 1. Validate required fields
    IF p_product->>'name' IS NULL OR TRIM(p_product->>'name') = '' THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Product name is required';
    END IF;

    IF p_product->>'slug' IS NULL OR TRIM(p_product->>'slug') = '' THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: Product slug is required';
    END IF;

    v_slug := LOWER(TRIM(p_product->>'slug'));

    -- 2. Insert into products
    INSERT INTO public.products (
        name,
        slug,
        description,
        category_id,
        status,
        base_price,
        sale_price,
        compare_at_price,
        cost_price,
        is_featured,
        seo_title,
        seo_description
    ) VALUES (
        TRIM(p_product->>'name'),
        v_slug,
        p_product->>'description',
        (p_product->>'category_id')::uuid,
        COALESCE(p_product->>'status', 'draft'),
        COALESCE((p_product->>'base_price')::bigint, 0),
        (p_product->>'sale_price')::bigint,
        (p_product->>'compare_at_price')::bigint,
        (p_product->>'cost_price')::bigint,
        COALESCE((p_product->>'is_featured')::boolean, false),
        p_product->>'seo_title',
        p_product->>'seo_description'
    )
    RETURNING id INTO v_product_id;

    -- 3. Resolve SKU
    IF p_sku IS NOT NULL AND TRIM(p_sku) <> '' THEN
        v_sku := UPPER(TRIM(p_sku));
    ELSE
        v_sku := UPPER(SUBSTRING(REGEXP_REPLACE(v_slug, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 10)) || '-DEFAULT';
    END IF;

    -- 4. Insert default variant
    -- The existing trigger_ensure_variant_inventory automatically creates the inventory_records row.
    INSERT INTO public.product_variants (
        product_id,
        sku,
        is_default,
        status,
        option_combination
    ) VALUES (
        v_product_id,
        v_sku,
        true,
        'active',
        '{}'::jsonb
    )
    RETURNING id INTO v_variant_id;

    -- 5. If initial stock requested, update the trigger-created inventory record
    IF v_stock > 0 THEN
        UPDATE public.inventory_records
        SET on_hand_quantity = v_stock,
            updated_at       = NOW()
        WHERE variant_id = v_variant_id;
    END IF;

    -- 6. Fetch the complete created product record
    SELECT * INTO v_product_row FROM public.products WHERE id = v_product_id;

    RETURN to_jsonb(v_product_row) || jsonb_build_object(
        'default_variant_id', v_variant_id,
        'default_sku', v_sku,
        'initial_stock', v_stock
    );
END;
$$;

-- Security Grants: service_role only
REVOKE ALL ON FUNCTION public.create_product_admin_rpc(jsonb, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_admin_rpc(jsonb, integer, text) TO service_role;
