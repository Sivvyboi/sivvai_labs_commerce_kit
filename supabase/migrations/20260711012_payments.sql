-- =============================================================================
-- 012_payments.sql
-- Payments Domain: payment_attempts and payment_events.
-- =============================================================================

-- Payment Attempts
CREATE TABLE IF NOT EXISTS payment_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES orders(id) ON DELETE RESTRICT NOT NULL, -- Keep records for audit
    attempt_number integer NOT NULL DEFAULT 1,
    provider text NOT NULL, -- e.g. 'paystack', 'bank_transfer'
    provider_reference text UNIQUE,
    idempotency_key text UNIQUE NOT NULL,
    amount money_amount NOT NULL,
    currency currency_code NOT NULL DEFAULT 'NGN',
    status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'pending', 'confirmed', 'failed', 'abandoned')),
    initiated_at timestamptz DEFAULT now() NOT NULL,
    confirmed_at timestamptz,
    metadata jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Payment Events (webhook log)
CREATE TABLE IF NOT EXISTS payment_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_attempt_id uuid REFERENCES payment_attempts(id) ON DELETE RESTRICT NOT NULL,
    event_type text NOT NULL, -- e.g. 'charge.success', 'charge.failed'
    raw_payload jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_attempts_order ON payment_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_attempt ON payment_events(payment_attempt_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_payment_attempts
    BEFORE UPDATE ON payment_attempts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
