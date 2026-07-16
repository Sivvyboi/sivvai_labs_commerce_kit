-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL UNIQUE,
    guest_contact JSONB,
    status order_status NOT NULL DEFAULT 'pending',
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    shipping_method_snapshot JSONB,
    shipping_rate_snapshot JSONB,
    subtotal INT8 NOT NULL DEFAULT 0,
    shipping_total INT8 NOT NULL DEFAULT 0,
    discount_total INT8 NOT NULL DEFAULT 0,
    tax_total INT8 NOT NULL DEFAULT 0,
    grand_total INT8 NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create order_lines table
CREATE TABLE order_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
    product_name_snapshot TEXT NOT NULL,
    variant_label_snapshot TEXT,
    sku_snapshot TEXT,
    image_url_snapshot TEXT,
    unit_price_snapshot INT8 NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    line_total INT8 NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_order_lines_updated_at
BEFORE UPDATE ON order_lines
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create order_status_events table
CREATE TABLE order_status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    from_status order_status,
    to_status order_status NOT NULL,
    actor TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create order_notes table
CREATE TABLE order_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    author_type note_author_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extra Indexes from Section 5
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_lines_order_id ON order_lines(order_id);
CREATE INDEX idx_order_status_events_order_id ON order_status_events(order_id);
CREATE INDEX idx_order_notes_order_id ON order_notes(order_id);
