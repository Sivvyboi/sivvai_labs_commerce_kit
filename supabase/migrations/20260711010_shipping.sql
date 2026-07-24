-- =============================================================================
-- 010_shipping.sql
-- Shipping and Fulfilment Domain: methods, zones, rates.
-- Also resolves the deferred FK on checkout_sessions.
-- =============================================================================

-- Fulfilment Methods (Pickup, Local, Courier)
CREATE TABLE IF NOT EXISTS fulfilment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL CHECK (type IN ('pickup', 'local_delivery', 'courier')),
    name text NOT NULL,
    description text,
    is_enabled boolean NOT NULL DEFAULT false,
    estimated_days_min integer NOT NULL DEFAULT 1,
    estimated_days_max integer NOT NULL DEFAULT 5,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Shipping Zones (e.g. Lagos, Nationwide)
CREATE TABLE IF NOT EXISTS shipping_zones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    regions text[] NOT NULL DEFAULT '{}', -- e.g. ['Lagos', 'Abuja']
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Shipping Rates per Method + Zone
CREATE TABLE IF NOT EXISTS shipping_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fulfilment_method_id uuid REFERENCES fulfilment_methods(id) ON DELETE CASCADE NOT NULL,
    zone_id uuid REFERENCES shipping_zones(id) ON DELETE CASCADE NOT NULL,
    rate_type text NOT NULL CHECK (rate_type IN ('flat', 'weight_based', 'free_above')),
    flat_amount money_amount NOT NULL DEFAULT 0,
    per_kg_amount money_amount NOT NULL DEFAULT 0,
    free_above_order_total money_amount,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Resolve the deferred FK on checkout_sessions
ALTER TABLE checkout_sessions
    ADD CONSTRAINT fk_checkout_sessions_fulfilment_method
    FOREIGN KEY (fulfilment_method_id) REFERENCES fulfilment_methods(id)
    ON DELETE RESTRICT;

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_fulfilment_methods
    BEFORE UPDATE ON fulfilment_methods
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_shipping_zones
    BEFORE UPDATE ON shipping_zones
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_shipping_rates
    BEFORE UPDATE ON shipping_rates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
