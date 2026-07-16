-- Create promotions table
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type promotion_type NOT NULL,
    value INT8 NOT NULL DEFAULT 0, -- Store as percentage or cents/kobo
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_promotions_updated_at
BEFORE UPDATE ON promotions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create promotion_rules table
CREATE TABLE promotion_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_promotion_rules_updated_at
BEFORE UPDATE ON promotion_rules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create coupon_codes table
CREATE TABLE coupon_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    max_uses INT,
    current_uses INT NOT NULL DEFAULT 0,
    max_uses_per_customer INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_coupon_codes_updated_at
BEFORE UPDATE ON coupon_codes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for FK performance
CREATE INDEX idx_promotion_rules_promotion_id ON promotion_rules(promotion_id);
CREATE INDEX idx_coupon_codes_promotion_id ON coupon_codes(promotion_id);
