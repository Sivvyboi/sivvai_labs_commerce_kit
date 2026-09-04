-- =============================================================================
-- 20260904050_variant_domain_integrity.sql
-- Catalog Domain: Variant Domain Contract & Generation Lifecycle Integrity
--
-- 1. Backfills missing inventory records for existing variants.
-- 2. Enforces single default variant per product via partial unique index.
-- 3. Enforces unique option combination per product for non-archived variants.
-- 4. Creates trigger to automatically guarantee inventory record creation.
-- 5. Provides atomic set_product_default_variant function.
-- =============================================================================

-- 1. Backfill inventory records for any variant missing one
INSERT INTO public.inventory_records (
    variant_id,
    on_hand_quantity,
    reserved_quantity,
    low_stock_threshold,
    track_inventory
)
SELECT pv.id, 0, 0, 5, true
FROM public.product_variants pv
LEFT JOIN public.inventory_records ir ON ir.variant_id = pv.id
WHERE ir.id IS NULL
ON CONFLICT (variant_id) DO NOTHING;

-- 2. Reconcile default variants before creating unique index
-- If a product has multiple is_default = true, keep the oldest and reset others
WITH ranked_defaults AS (
    SELECT id, product_id,
           ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at ASC) as rn
    FROM public.product_variants
    WHERE is_default = true
)
UPDATE public.product_variants
SET is_default = false
WHERE id IN (
    SELECT id FROM ranked_defaults WHERE rn > 1
);

-- If a product has variants but NONE is marked is_default = true, mark the first active one as default
WITH missing_default_products AS (
    SELECT pv.product_id
    FROM public.product_variants pv
    GROUP BY pv.product_id
    HAVING count(*) FILTER (WHERE pv.is_default = true) = 0
),
candidate_defaults AS (
    SELECT pv.id,
           ROW_NUMBER() OVER (PARTITION BY pv.product_id ORDER BY (pv.status = 'active') DESC, pv.created_at ASC) as rn
    FROM public.product_variants pv
    INNER JOIN missing_default_products mdp ON mdp.product_id = pv.product_id
)
UPDATE public.product_variants
SET is_default = true
WHERE id IN (
    SELECT id FROM candidate_defaults WHERE rn = 1
);

-- 3. Enforce exactly one default variant per product
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_single_default
ON public.product_variants(product_id)
WHERE is_default = true;

-- 4. Enforce unique option combination per product among non-archived variants
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_unique_combo
ON public.product_variants(product_id, option_combination)
WHERE archived_at IS NULL;

-- 5. Trigger function to guarantee 1-to-1 inventory record for every created variant
CREATE OR REPLACE FUNCTION public.ensure_variant_inventory_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.inventory_records (
        variant_id,
        on_hand_quantity,
        reserved_quantity,
        low_stock_threshold,
        track_inventory
    )
    VALUES (
        NEW.id,
        0,
        0,
        5,
        true
    )
    ON CONFLICT (variant_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ensure_variant_inventory ON public.product_variants;
CREATE TRIGGER trigger_ensure_variant_inventory
    AFTER INSERT ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_variant_inventory_record();

-- 6. Atomic RPC function to switch product default variant
CREATE OR REPLACE FUNCTION public.set_product_default_variant(p_product_id uuid, p_variant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify variant belongs to product
    IF NOT EXISTS (
        SELECT 1 FROM public.product_variants
        WHERE id = p_variant_id AND product_id = p_product_id
    ) THEN
        RAISE EXCEPTION 'Variant % does not belong to product %', p_variant_id, p_product_id;
    END IF;

    -- Unset all default variants for product
    UPDATE public.product_variants
    SET is_default = false
    WHERE product_id = p_product_id AND is_default = true AND id <> p_variant_id;

    -- Set new default variant
    UPDATE public.product_variants
    SET is_default = true
    WHERE id = p_variant_id AND product_id = p_product_id;
END;
$$;

-- Grant execute permissions on RPC to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.set_product_default_variant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_product_default_variant(uuid, uuid) TO service_role;
