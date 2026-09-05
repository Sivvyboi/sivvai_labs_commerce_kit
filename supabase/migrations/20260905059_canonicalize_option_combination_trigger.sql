-- =============================================================================
-- 20260905059_canonicalize_option_combination_trigger.sql
-- Catalog Domain: DB-level option_combination canonicalization
--
-- The TypeScript layer (lib/variants/combination.ts) normalizes option
-- combinations before writing them. However, direct DB writes (migrations,
-- admin SQL, future integrations) bypass this layer and could create semantic
-- duplicates like {"Color":"Black"} vs {"Color":"black "} or {"size":"M"}.
--
-- This migration adds a BEFORE INSERT / UPDATE trigger on product_variants
-- that canonicalizes option_combination on every write:
--   - Trims leading/trailing whitespace from all keys and values.
--   - NOTE: Keys and values retain their original case (the app layer uses
--     title-case e.g. "Color" / "Red"). Case folding is NOT applied at the DB
--     level to avoid collisions with the TypeScript normalization, which is
--     case-preserving. The TypeScript layer is authoritative for case.
--
-- The trigger fires BEFORE INSERT OR UPDATE so the canonical form is always
-- stored, and the partial unique index uq_product_variants_unique_combo can
-- rely on deterministic JSONB equality.
--
-- IDEMPOTENT: Safe to re-run (CREATE OR REPLACE + DROP TRIGGER IF EXISTS).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Canonicalization function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.canonicalize_option_combination()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_raw    jsonb := NEW.option_combination;
    v_result jsonb := '{}'::jsonb;
    v_key    text;
    v_val    text;
BEGIN
    -- NULL or empty JSON object → store as '{}' (simple product canonical form)
    IF v_raw IS NULL OR v_raw = 'null'::jsonb THEN
        NEW.option_combination := '{}'::jsonb;
        RETURN NEW;
    END IF;

    -- For each key-value pair: trim whitespace, discard blank key/value pairs
    FOR v_key, v_val IN SELECT key, value::text FROM jsonb_each_text(v_raw) LOOP
        v_key := TRIM(v_key);
        v_val := TRIM(v_val);

        -- Remove surrounding JSON string quotes that come from jsonb_each_text
        -- (jsonb_each_text already unquotes string values, so v_val is plain text)
        IF v_key <> '' AND v_val <> '' AND v_val <> 'null' THEN
            v_result := jsonb_set(v_result, ARRAY[v_key], to_jsonb(v_val));
        END IF;
    END LOOP;

    NEW.option_combination := v_result;
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Attach trigger to product_variants
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_canonicalize_option_combination ON public.product_variants;

CREATE TRIGGER trigger_canonicalize_option_combination
    BEFORE INSERT OR UPDATE OF option_combination
    ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.canonicalize_option_combination();

-- No GRANT required — trigger functions are not directly callable by users.
