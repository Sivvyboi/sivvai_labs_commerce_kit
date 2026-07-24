-- =============================================================================
-- 014_promotions.sql
-- Promotions Domain: promotions, promotion_rules, and coupon_codes.
-- =============================================================================

-- Promotions (Rules and configurations)
CREATE TABLE IF NOT EXISTS promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('percentage', 'fixed_amount')),
    value money_amount NOT NULL, -- Either percent (e.g. 10 for 10%) or fixed minor units
    starts_at timestamptz,
    ends_at timestamptz,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Promotion Rules (Eligibility conditions)
CREATE TABLE IF NOT EXISTS promotion_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id uuid REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
    rule_type text NOT NULL, -- e.g. 'minimum_subtotal', 'item_quantity'
    conditions jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Coupon Codes
CREATE TABLE IF NOT EXISTS coupon_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id uuid REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
    code text UNIQUE NOT NULL,
    max_uses inventory_quantity, -- Max globally, null for unlimited
    current_uses inventory_quantity NOT NULL DEFAULT 0,
    max_uses_per_customer inventory_quantity,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupon_codes_promo ON coupon_codes(promotion_id);

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_promotions
    BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_coupon_codes
    BEFORE UPDATE ON coupon_codes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
