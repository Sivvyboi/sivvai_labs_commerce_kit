-- =============================================================================
-- 20260905058_atomic_sync_product_variants_rpc.sql
-- Catalog Domain: Atomic variant sync RPC
--
-- Previously, syncProductVariants in product-service.ts performed a series of
-- sequential DB operations (reactivate, create, retire, ensure-default) with
-- no transaction boundary. A failure at any step left the product in partial
-- variant state (zombie variants, missing defaults).
--
-- This migration introduces:
--   sync_product_variants_rpc(p_product_id uuid, p_target_combinations jsonb)
--
-- The TypeScript layer computes the target combinations (Cartesian product,
-- already normalized) and passes them as a JSONB array. The RPC performs ALL
-- of the following atomically within a single SECURITY DEFINER transaction:
--
--   1. Validates the product exists.
--   2. Fetches current variants with order + reservation counts.
--   3. For each target combination:
--        a. Searches for a reactivation candidate (non-archived, no order history,
--           matching combination via JSONB equality of already-normalized data).
--        b. If found and inactive → reactivate.
--        c. If not found → create new variant + inventory record (via trigger).
--   4. For stale variants (not in target set):
--        a. Has orders or reservations → deactivate + archive (retain for history).
--        b. Otherwise → delete.
--   5. Enforces exactly-one-default invariant via set_product_default_variant.
--   6. Returns a summary JSONB: {created, reactivated, retired, total}.
--
-- SKU generation mirrors generateVariantSku in lib/variants/combination.ts:
--   {SLUG_PREFIX}-{VALUE_PARTS...}
--
-- IDEMPOTENT: Safe to re-run (CREATE OR REPLACE).
-- Callable only by service_role (admin server actions).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_product_variants_rpc(
    p_product_id          uuid,
    p_target_combinations jsonb   -- normalized [{\"Color\":\"Red\",\"Size\":\"M\"}, {}]
)
RETURNS jsonb   -- {created, reactivated, retired, total, default_variant_id}
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product           products%ROWTYPE;
    v_target_combo      jsonb;
    v_existing          RECORD;
    v_matched_ids       uuid[] := ARRAY[]::uuid[];
    v_created           int    := 0;
    v_reactivated       int    := 0;
    v_retired           int    := 0;
    v_new_variant_id    uuid;
    v_sku               text;
    v_slug_prefix       text;
    v_combo_idx         int    := 0;
    v_active_variants   uuid[];
    v_default_id        uuid;
    v_current_default   uuid;
BEGIN
    -- -------------------------------------------------------------------------
    -- 1. Validate product exists
    -- -------------------------------------------------------------------------
    SELECT * INTO v_product
    FROM   public.products
    WHERE  id         = p_product_id
      AND  deleted_at IS NULL
    FOR    UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PRODUCT_NOT_FOUND:product=%', p_product_id;
    END IF;

    -- -------------------------------------------------------------------------
    -- 2. Validate target combinations
    -- -------------------------------------------------------------------------
    IF p_target_combinations IS NULL OR jsonb_array_length(p_target_combinations) = 0 THEN
        RAISE EXCEPTION 'INVALID_COMBINATIONS:empty or null target combinations for product=%', p_product_id;
    END IF;

    -- Compute slug prefix for SKU generation (mirrors TypeScript generateVariantSku)
    v_slug_prefix := UPPER(REGEXP_REPLACE(COALESCE(v_product.slug, ''), '[^A-Z0-9]', '', 'gi'));
    v_slug_prefix := SUBSTRING(v_slug_prefix FROM 1 FOR 8);

    -- -------------------------------------------------------------------------
    -- 3. Process each target combination
    -- -------------------------------------------------------------------------
    FOR v_target_combo IN SELECT * FROM jsonb_array_elements(p_target_combinations) LOOP
        v_combo_idx := v_combo_idx + 1;

        -- Search for a reactivation candidate:
        -- Must match combination exactly (JSONB equality on already-normalized data),
        -- be non-archived, and have NO order history.
        SELECT pv.id, pv.status
        INTO   v_existing
        FROM   public.product_variants pv
        WHERE  pv.product_id        = p_product_id
          AND  pv.option_combination = v_target_combo
          AND  pv.archived_at        IS NULL
          AND  NOT EXISTS (
               SELECT 1 FROM public.order_lines ol WHERE ol.variant_id = pv.id
          )
        ORDER BY pv.created_at ASC
        LIMIT  1;

        IF FOUND THEN
            -- Reactivation candidate found — track it
            v_matched_ids := array_append(v_matched_ids, v_existing.id);

            IF v_existing.status <> 'active' THEN
                -- Reactivate inactive variant
                UPDATE public.product_variants
                SET    status     = 'active',
                       archived_at = NULL,
                       updated_at  = NOW()
                WHERE  id = v_existing.id;

                v_reactivated := v_reactivated + 1;
            END IF;
        ELSE
            -- No candidate — create a new variant row.
            -- Build SKU: SLUGPREFIX-VAL1-VAL2 (sorted values, max 4 chars each)
            SELECT v_slug_prefix || '-' ||
                   COALESCE(
                       NULLIF(
                           string_agg(
                               SUBSTRING(UPPER(REGEXP_REPLACE(val, '[^A-Z0-9]', '', 'gi')) FROM 1 FOR 4),
                               '-' ORDER BY key
                           ),
                           ''
                       ),
                       'DEFAULT-' || v_combo_idx::text
                   )
            INTO   v_sku
            FROM   jsonb_each_text(v_target_combo) t(key, val)
            WHERE  val IS NOT NULL AND val <> '';

            -- Handle empty combo ({} = simple product)
            IF v_sku IS NULL OR v_sku = v_slug_prefix || '-' THEN
                v_sku := v_slug_prefix || '-DEFAULT-' || v_combo_idx::text;
            END IF;

            INSERT INTO public.product_variants (
                product_id,
                sku,
                option_combination,
                status,
                is_default
            ) VALUES (
                p_product_id,
                v_sku,
                v_target_combo,
                'active',
                false       -- default is set in step 5
            )
            RETURNING id INTO v_new_variant_id;

            -- trigger_ensure_variant_inventory fires automatically to create
            -- the companion inventory_records row. No manual insert needed.

            v_matched_ids := array_append(v_matched_ids, v_new_variant_id);
            v_created := v_created + 1;
        END IF;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 4. Handle stale variants not in the target set
    -- -------------------------------------------------------------------------
    FOR v_existing IN
        SELECT
            pv.id,
            pv.status,
            pv.archived_at,
            pv.is_default,
            (SELECT COUNT(*) FROM public.order_lines          ol WHERE ol.variant_id = pv.id) AS order_count,
            (SELECT COUNT(*) FROM public.inventory_reservations ir WHERE ir.variant_id = pv.id AND ir.status = 'active') AS reservation_count
        FROM public.product_variants pv
        WHERE pv.product_id = p_product_id
          AND NOT (pv.id = ANY(v_matched_ids))
    LOOP
        IF v_existing.order_count > 0 OR v_existing.reservation_count > 0 THEN
            -- Historical integrity: deactivate and archive, preserve row
            IF v_existing.status <> 'inactive' OR v_existing.archived_at IS NULL OR v_existing.is_default THEN
                UPDATE public.product_variants
                SET    status      = 'inactive',
                       archived_at = COALESCE(v_existing.archived_at, NOW()),
                       is_default  = false,
                       updated_at  = NOW()
                WHERE  id = v_existing.id;

                v_retired := v_retired + 1;
            END IF;
        ELSE
            -- No historical references — safe to delete permanently
            DELETE FROM public.product_variants WHERE id = v_existing.id;
            v_retired := v_retired + 1;
        END IF;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 5. Enforce exactly-one-default invariant
    -- -------------------------------------------------------------------------
    -- Find current default among active, non-archived variants
    SELECT id INTO v_current_default
    FROM   public.product_variants
    WHERE  product_id  = p_product_id
      AND  status      = 'active'
      AND  archived_at IS NULL
      AND  is_default  = true
    LIMIT  1;

    -- Collect all active, non-archived variant IDs
    SELECT array_agg(id ORDER BY created_at ASC) INTO v_active_variants
    FROM   public.product_variants
    WHERE  product_id  = p_product_id
      AND  status      = 'active'
      AND  archived_at IS NULL;

    IF v_active_variants IS NOT NULL AND array_length(v_active_variants, 1) > 0 THEN
        -- Prefer to keep the existing default if it's still active
        IF v_current_default IS NOT NULL AND v_current_default = ANY(v_active_variants) THEN
            v_default_id := v_current_default;
        ELSE
            -- Elect the first active variant (stable ordering by created_at)
            v_default_id := v_active_variants[1];
        END IF;

        -- Apply via the atomic RPC (which also clears other defaults)
        PERFORM public.set_product_default_variant(p_product_id, v_default_id);
    ELSE
        v_default_id := NULL;
    END IF;

    -- -------------------------------------------------------------------------
    -- 6. Return summary
    -- -------------------------------------------------------------------------
    RETURN jsonb_build_object(
        'created',            v_created,
        'reactivated',        v_reactivated,
        'retired',            v_retired,
        'total',              COALESCE(array_length(v_active_variants, 1), 0),
        'default_variant_id', v_default_id
    );
END;
$$;

-- Callable only from the server via createAdminClient() (service_role).
-- Authenticated users (customers) must never be able to trigger a variant sync.
REVOKE EXECUTE ON FUNCTION public.sync_product_variants_rpc(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.sync_product_variants_rpc(uuid, jsonb) TO service_role;
