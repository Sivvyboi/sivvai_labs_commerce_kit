-- Create payment_attempts table
CREATE TABLE payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    attempt_number INT NOT NULL DEFAULT 1,
    provider TEXT NOT NULL,
    provider_reference TEXT UNIQUE,
    idempotency_key TEXT NOT NULL UNIQUE,
    amount INT8 NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status payment_status NOT NULL DEFAULT 'pending',
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_payment_attempts_updated_at
BEFORE UPDATE ON payment_attempts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create payment_events table
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_attempt_id UUID NOT NULL REFERENCES payment_attempts(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extra Indexes from Section 5
CREATE INDEX idx_payment_attempts_order_id ON payment_attempts(order_id);
CREATE INDEX idx_payment_events_payment_attempt_id ON payment_events(payment_attempt_id);
