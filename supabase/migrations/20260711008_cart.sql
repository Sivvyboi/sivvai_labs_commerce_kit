-- =============================================================================
-- 008_cart.sql
-- Cart Domain: carts and cart_lines.
-- =============================================================================

-- Carts (can be anonymous or authenticated)
CREATE TABLE IF NOT EXISTS carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'merged', 'converted')),
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Cart Lines
CREATE TABLE IF NOT EXISTS cart_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id uuid REFERENCES carts(id) ON DELETE CASCADE NOT NULL,
    variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL,
    quantity inventory_quantity NOT NULL CHECK (quantity > 0),
    unit_price_snapshot money_amount NOT NULL,
    added_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT uq_cart_variant UNIQUE (cart_id, variant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_carts_customer ON carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_cart_lines_cart ON cart_lines(cart_id);

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_carts
    BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_cart_lines
    BEFORE UPDATE ON cart_lines
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
