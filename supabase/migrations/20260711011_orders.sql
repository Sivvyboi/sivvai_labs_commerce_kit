-- =============================================================================
-- 011_orders.sql
-- Orders Domain: orders, order_lines, status events, and notes.
-- =============================================================================

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    order_number text UNIQUE NOT NULL,
    guest_contact jsonb, -- { email, phone, first_name, last_name }
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')),
    shipping_address jsonb, -- { street_line_1, street_line_2, city, state, country, label }
    billing_address jsonb, -- { street_line_1, street_line_2, city, state, country, label }
    shipping_method_snapshot jsonb, -- { type, name, description }
    shipping_rate_snapshot jsonb, -- { rate_type, flat_amount, per_kg_amount }
    subtotal money_amount NOT NULL,
    shipping_total money_amount NOT NULL DEFAULT 0,
    discount_total money_amount NOT NULL DEFAULT 0,
    tax_total money_amount NOT NULL DEFAULT 0,
    grand_total money_amount NOT NULL,
    currency currency_code NOT NULL DEFAULT 'NGN',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Order Lines (Snapshotted for audit)
CREATE TABLE IF NOT EXISTS order_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    variant_id uuid REFERENCES product_variants(id) ON DELETE RESTRICT, -- Prevents deleting variants in orders
    product_name_snapshot text NOT NULL,
    variant_label_snapshot text NOT NULL,
    sku_snapshot text,
    image_url_snapshot text,
    unit_price_snapshot money_amount NOT NULL,
    quantity inventory_quantity NOT NULL CHECK (quantity > 0),
    line_total money_amount NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Order Status Events (Append-only lifecycle log)
CREATE TABLE IF NOT EXISTS order_status_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    actor text NOT NULL, -- e.g. 'system', 'admin', 'customer'
    note text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Order Notes (Buyer / Merchant annotations)
CREATE TABLE IF NOT EXISTS order_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    body text NOT NULL,
    author_type text NOT NULL CHECK (author_type IN ('buyer', 'merchant', 'system')),
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_lines_order ON order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_events_order ON order_status_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_orders
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
