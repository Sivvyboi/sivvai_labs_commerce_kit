-- =============================================================================
-- 20260904051_harden_set_default_variant_rpc.sql
-- Catalog Domain: Harden set_product_default_variant RPC
--
-- Adds a lifecycle guard to the existing set_product_default_variant RPC:
-- Only an active (status = 'active') and non-archived (archived_at IS NULL)
-- variant may be set as the product default.
--
-- This is a CREATE OR REPLACE of the function defined in migration 050.
-- The calling convention (argument names and types) is identical.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_product_default_variant(p_product_id uuid, p_variant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Verify the variant belongs to the product.
    IF NOT EXISTS (
        SELECT 1 FROM public.product_variants
        WHERE id = p_variant_id AND product_id = p_product_id
    ) THEN
        RAISE EXCEPTION 'Variant % does not belong to product %', p_variant_id, p_product_id;
    END IF;

    -- 2. Lifecycle guard: only active, non-archived variants may be default.
    IF NOT EXISTS (
        SELECT 1 FROM public.product_variants
        WHERE id          = p_variant_id
          AND product_id  = p_product_id
          AND status      = 'active'
          AND archived_at IS NULL
    ) THEN
        RAISE EXCEPTION
            'Variant % cannot be set as default: must be active and non-archived',
            p_variant_id;
    END IF;

    -- 3. Atomically unset the current default and promote the new one.
    UPDATE public.product_variants
    SET is_default = false
    WHERE product_id = p_product_id AND is_default = true AND id <> p_variant_id;

    UPDATE public.product_variants
    SET is_default = true
    WHERE id = p_variant_id AND product_id = p_product_id;
END;
$$;

-- Retain grants (same as migration 050)
GRANT EXECUTE ON FUNCTION public.set_product_default_variant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_default_variant(uuid, uuid) TO service_role;
