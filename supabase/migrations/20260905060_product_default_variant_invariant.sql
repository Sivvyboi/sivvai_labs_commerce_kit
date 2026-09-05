-- =============================================================================
-- 20260905060_product_default_variant_invariant.sql
-- Catalog Domain: Enforce Exactly-One Default Variant Invariant
--
-- Phase 1 established uq_product_variants_single_default preventing > 1 default.
-- This migration guarantees that for any product with active variants, there is
-- NEVER 0 defaults:
--   1. Reconciles existing products: if any product has active variants but no
--      active default, promotes the oldest active variant to is_default = true.
--   2. Prevents setting is_default = true on inactive or archived variants.
--   3. Automatically assigns is_default = true to the first active variant of a product.
--   4. Automatically promotes a successor default when the current default is
--      deactivated, archived, or deleted (if active variants remain).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Reconcile existing data:
--    a) Demote any inactive or archived variants currently marked as default
--    b) Ensure any product with active variants has exactly one active default
-- ---------------------------------------------------------------------------
UPDATE public.product_variants
SET is_default = false,
    updated_at = NOW()
WHERE is_default = true
  AND (status <> 'active' OR archived_at IS NOT NULL);

WITH active_products_without_default AS (
    SELECT pv.product_id
    FROM public.product_variants pv
    WHERE pv.status = 'active' AND pv.archived_at IS NULL
    GROUP BY pv.product_id
    HAVING count(*) FILTER (WHERE pv.is_default = true) = 0
),
candidate_defaults AS (
    SELECT pv.id,
           ROW_NUMBER() OVER (PARTITION BY pv.product_id ORDER BY pv.created_at ASC) as rn
    FROM public.product_variants pv
    INNER JOIN active_products_without_default apwd ON apwd.product_id = pv.product_id
    WHERE pv.status = 'active' AND pv.archived_at IS NULL
)
UPDATE public.product_variants
SET is_default = true,
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM candidate_defaults WHERE rn = 1
);

-- ---------------------------------------------------------------------------
-- 2. Guard: Cannot mark inactive or archived variant as default
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_variant_default_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.is_default = true THEN
        IF NEW.status <> 'active' OR NEW.archived_at IS NOT NULL THEN
            RAISE EXCEPTION 'INVALID_DEFAULT_VARIANT: Variant % cannot be default because status is % and archived_at is %',
                NEW.id, NEW.status, NEW.archived_at;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_variant_default_eligibility ON public.product_variants;
CREATE TRIGGER trigger_check_variant_default_eligibility
    BEFORE INSERT OR UPDATE OF is_default, status, archived_at
    ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.check_variant_default_eligibility();

-- ---------------------------------------------------------------------------
-- 3. Invariant maintenance trigger: guarantee exactly one default
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.maintain_product_default_variant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product_id   uuid;
    v_has_active   boolean;
    v_default_id   uuid;
    v_candidate_id uuid;
BEGIN
    -- Prevent infinite recursion
    IF pg_trigger_depth() > 1 THEN
        RETURN NULL;
    END IF;

    IF TG_OP = 'DELETE' THEN
        v_product_id := OLD.product_id;
    ELSE
        v_product_id := NEW.product_id;
    END IF;

    -- Check if product still has active non-archived variants
    SELECT EXISTS (
        SELECT 1 FROM public.product_variants
        WHERE product_id = v_product_id
          AND status = 'active'
          AND archived_at IS NULL
    ) INTO v_has_active;

    IF NOT v_has_active THEN
        -- No active variants remain: clear any default flag if present
        UPDATE public.product_variants
        SET is_default = false
        WHERE product_id = v_product_id AND is_default = true;
        RETURN NULL;
    END IF;

    -- Product has active variants: check if there is an active default
    SELECT id INTO v_default_id
    FROM public.product_variants
    WHERE product_id = v_product_id
      AND is_default = true
      AND status = 'active'
      AND archived_at IS NULL
    LIMIT 1;

    -- If no active default exists, promote the oldest active variant
    IF v_default_id IS NULL THEN
        SELECT id INTO v_candidate_id
        FROM public.product_variants
        WHERE product_id = v_product_id
          AND status = 'active'
          AND archived_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1;

        IF v_candidate_id IS NOT NULL THEN
            UPDATE public.product_variants
            SET is_default = false
            WHERE product_id = v_product_id AND is_default = true AND id <> v_candidate_id;

            UPDATE public.product_variants
            SET is_default = true,
                updated_at = NOW()
            WHERE id = v_candidate_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_maintain_product_default_variant ON public.product_variants;
CREATE TRIGGER trigger_maintain_product_default_variant
    AFTER INSERT OR UPDATE OF is_default, status, archived_at OR DELETE
    ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.maintain_product_default_variant();
