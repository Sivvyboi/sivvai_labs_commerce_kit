-- =============================================================================
-- 009_checkout.sql
-- Checkout Domain: checkout_sessions.
-- Also adds the deferred FK on inventory_reservations to checkout_sessions.
-- =============================================================================

-- Checkout Sessions (transient stage)
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id uuid REFERENCES carts(id) ON DELETE CASCADE NOT NULL,
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    guest_contact jsonb, -- { email, phone, first_name, last_name }
    shipping_address jsonb, -- { street_line_1, street_line_2, city, state, country, label }
    fulfilment_method_id uuid, -- FK added in 010_shipping.sql after fulfilment_methods is created
    payment_method text,
    promo_code text,
    idempotency_key text UNIQUE,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'expired')),
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Deferred FK constraint on inventory_reservations (from 006_inventory.sql)
ALTER TABLE inventory_reservations
    ADD CONSTRAINT fk_inventory_reservations_checkout_session
    FOREIGN KEY (checkout_session_id) REFERENCES checkout_sessions(id)
    ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_cart ON checkout_sessions(cart_id);

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_checkout_sessions
    BEFORE UPDATE ON checkout_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
