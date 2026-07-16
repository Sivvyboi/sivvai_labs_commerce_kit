-- Create carts table
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status cart_status NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_carts_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create cart_lines table
CREATE TABLE cart_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price_snapshot INT8,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cart_line_cart_variant_unique UNIQUE (cart_id, variant_id)
);

CREATE TRIGGER trigger_cart_lines_updated_at
BEFORE UPDATE ON cart_lines
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Extra Indexes from Section 5
CREATE INDEX idx_carts_customer_id ON carts(customer_id);
CREATE INDEX idx_cart_lines_cart_id ON cart_lines(cart_id);
