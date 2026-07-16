-- Create checkout_sessions table
CREATE TABLE checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    guest_contact JSONB,
    shipping_address JSONB,
    fulfilment_method_id UUID, -- Foreign key constraint added in shipping migration
    payment_method TEXT,
    promo_code TEXT,
    idempotency_key TEXT UNIQUE,
    status checkout_status NOT NULL DEFAULT 'open',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_checkout_sessions_updated_at
BEFORE UPDATE ON checkout_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Extra Indexes from Section 5
CREATE INDEX idx_checkout_sessions_cart_id ON checkout_sessions(cart_id);
CREATE INDEX idx_checkout_sessions_customer_id ON checkout_sessions(customer_id);
