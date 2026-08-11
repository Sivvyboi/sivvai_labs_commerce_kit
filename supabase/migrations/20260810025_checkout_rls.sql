-- =============================================================================
-- 20260810025_checkout_rls.sql
-- Security Hardening: Fix checkout_sessions RLS policies.
-- Replace broad FOR ALL policy with explicit SELECT, INSERT, and UPDATE policies.
-- =============================================================================

-- 1. Drop existing broad policy
DROP POLICY IF EXISTS "Allow users to manage own checkout sessions" ON checkout_sessions;

-- 2. Create explicit SELECT policy
CREATE POLICY "Allow users to select own checkout sessions" ON checkout_sessions
    FOR SELECT TO public USING (
        (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
        OR (cart_id IN (
            SELECT id FROM carts
            WHERE (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
               OR (cart_token_hash IS NOT NULL AND cart_token_hash = NULLIF(current_setting('request.headers', true)::json->>'x-cart-token-hash', ''))
        ))
    );

-- 3. Create explicit INSERT policy
CREATE POLICY "Allow users to insert own checkout sessions" ON checkout_sessions
    FOR INSERT TO public WITH CHECK (
        (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
        OR (cart_id IN (
            SELECT id FROM carts
            WHERE (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
               OR (cart_token_hash IS NOT NULL AND cart_token_hash = NULLIF(current_setting('request.headers', true)::json->>'x-cart-token-hash', ''))
        ))
    );

-- 4. Create explicit UPDATE policy
CREATE POLICY "Allow users to update own checkout sessions" ON checkout_sessions
    FOR UPDATE TO public
    USING (
        (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
        OR (cart_id IN (
            SELECT id FROM carts
            WHERE (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
               OR (cart_token_hash IS NOT NULL AND cart_token_hash = NULLIF(current_setting('request.headers', true)::json->>'x-cart-token-hash', ''))
        ))
    )
    WITH CHECK (
        (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
        OR (cart_id IN (
            SELECT id FROM carts
            WHERE (customer_id IS NOT NULL AND customer_id IN (SELECT id FROM customers WHERE auth_id = (SELECT auth.uid())))
               OR (cart_token_hash IS NOT NULL AND cart_token_hash = NULLIF(current_setting('request.headers', true)::json->>'x-cart-token-hash', ''))
        ))
    );
