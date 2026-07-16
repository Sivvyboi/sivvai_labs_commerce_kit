-- Create fulfilment_methods table
CREATE TABLE fulfilment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type fulfilment_type NOT NULL,
    name TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_days_min INT,
    estimated_days_max INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_fulfilment_methods_updated_at
BEFORE UPDATE ON fulfilment_methods
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create shipping_zones table
CREATE TABLE shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    regions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_shipping_zones_updated_at
BEFORE UPDATE ON shipping_zones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create shipping_rates table
CREATE TABLE shipping_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fulfilment_method_id UUID NOT NULL REFERENCES fulfilment_methods(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
    rate_type shipping_rate_type NOT NULL DEFAULT 'flat',
    flat_amount INT8 NOT NULL DEFAULT 0,
    per_kg_amount INT8 NOT NULL DEFAULT 0,
    free_above_order_total INT8,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_shipping_rates_updated_at
BEFORE UPDATE ON shipping_rates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add the foreign key constraint to checkout_sessions
ALTER TABLE checkout_sessions
ADD CONSTRAINT fk_checkout_sessions_fulfilment_method
FOREIGN KEY (fulfilment_method_id) REFERENCES fulfilment_methods(id) ON DELETE SET NULL;

-- Extra Indexes from Section 5 and best practices
CREATE INDEX idx_shipping_rates_fulfilment_method_id ON shipping_rates(fulfilment_method_id);
CREATE INDEX idx_shipping_rates_zone_id ON shipping_rates(zone_id);
