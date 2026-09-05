-- =============================================================================
-- 20260905062_category_seo_and_image_ownership.sql
-- Catalog Domain: Category SEO Fields & Variant Image Ownership Invariant
--
-- 1. Adds first-class SEO fields to categories (seo_title, seo_description, og_image).
-- 2. Adds a database trigger to product_variants enforcing that variant image_id
--    must belong to the same product (preventing foreign image references).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Category SEO Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.categories
    ADD COLUMN IF NOT EXISTS seo_title text,
    ADD COLUMN IF NOT EXISTS seo_description text,
    ADD COLUMN IF NOT EXISTS og_image text;

-- ---------------------------------------------------------------------------
-- 2. Variant Image Ownership Enforcement
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_variant_image_ownership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_image_product_id uuid;
BEGIN
    IF NEW.image_id IS NOT NULL THEN
        SELECT product_id INTO v_image_product_id
        FROM public.product_images
        WHERE id = NEW.image_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'IMAGE_NOT_FOUND: Product image % does not exist', NEW.image_id;
        END IF;

        IF v_image_product_id <> NEW.product_id THEN
            RAISE EXCEPTION 'FOREIGN_IMAGE_REFERENCE: Image % belongs to product %, not product %',
                NEW.image_id, v_image_product_id, NEW.product_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_variant_image_ownership ON public.product_variants;
CREATE TRIGGER trigger_check_variant_image_ownership
    BEFORE INSERT OR UPDATE OF image_id, product_id
    ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.check_variant_image_ownership();
