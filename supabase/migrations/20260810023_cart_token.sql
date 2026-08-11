-- =============================================================================
-- 20260810023_cart_token.sql
-- Add cart_token_hash column to carts table and update RLS policies for guest carts.
-- Replace insecure customer_id IS NULL fallback with signed cart token validation.
-- =============================================================================

-- 1. Add cart_token_hash column to carts
ALTER TABLE carts
    ADD COLUMN IF NOT EXISTS cart_token_hash TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_carts_token_hash ON carts(cart_token_hash)
    WHERE cart_token_hash IS NOT NULL;

-- 2. Drop existing insecure cart RLS policies
DROP POLICY IF EXISTS "Allow users to select own carts" ON carts;
DROP POLICY IF EXISTS "Allow users to insert own carts" ON carts;
DROP POLICY IF EXISTS "Allow users to update own carts" ON carts;

-- 3. Create secure cart RLS policies matching customer_id OR x-cart-token-hash header
CREATE POLICY "Allow users to select own carts" ON carts
    FOR SELECT TO public USING (
        (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
        OR (cart_token_hash IS NOT NULL AND cart_token_hash = NULLIF(current_setting('request.headers', true)::json->>'x-cart-token-hash', ''))
    );

CREATE POLICY "Allow users to insert own carts" ON carts
    FOR INSERT TO public WITH CHECK (
        (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
        OR (cart_token_hash IS NOT NULL AND cart_token_hash = NULLIF(current_setting('request.headers', true)::json->>'x-cart-token-hash', ''))
    );

CREATE POLICY "Allow users to update own carts" ON carts
    FOR UPDATE TO public
    USING (
        (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
        OR (cart_token_hash IS NOT NULL AND cart_token_hash = NULLIF(current_setting('request.headers', true)::json->>'x-cart-token-hash', ''))
    )
    WITH CHECK (
        (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
        OR (cart_token_hash IS NOT NULL AND cart_token_hash = NULLIF(current_setting('request.headers', true)::json->>'x-cart-token-hash', ''))
    );
