-- =============================================================================
-- 006_inventory.sql
-- Inventory Domain: inventory_records, stock_movements, inventory_reservations.
-- =============================================================================

-- Inventory Records (1-to-1 with variant)
CREATE TABLE IF NOT EXISTS inventory_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id uuid UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL,
    on_hand_quantity inventory_quantity NOT NULL DEFAULT 0,
    reserved_quantity inventory_quantity NOT NULL DEFAULT 0,
    incoming_quantity inventory_quantity NOT NULL DEFAULT 0,
    low_stock_threshold inventory_quantity NOT NULL DEFAULT 10,
    track_inventory boolean NOT NULL DEFAULT true,
    allow_backorders boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Stock Movements (append-only log)
CREATE TABLE IF NOT EXISTS stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_record_id uuid REFERENCES inventory_records(id) ON DELETE RESTRICT NOT NULL,
    movement_type text NOT NULL CHECK (movement_type IN ('inbound', 'outbound', 'adjustment', 'transfer')),
    quantity_delta integer NOT NULL, -- Plain integer to allow negative/signed deltas
    reason text,
    reference_id uuid,
    performed_by text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Inventory Reservations (checkout hold state)
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_record_id uuid REFERENCES inventory_records(id) ON DELETE RESTRICT NOT NULL,
    variant_id uuid REFERENCES product_variants(id) ON DELETE RESTRICT NOT NULL,
    checkout_session_id uuid, -- Foreign key target doesn't exist yet, FK added in 009_checkout.sql
    quantity inventory_quantity NOT NULL CHECK (quantity > 0),
    status reservation_status NOT NULL DEFAULT 'active',
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    released_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reservations_calc ON inventory_reservations(inventory_record_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_session ON inventory_reservations(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_reservations_expiry ON inventory_reservations(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_stock_movements_record ON stock_movements(inventory_record_id);

-- Attach update trigger to inventory_records
CREATE TRIGGER set_updated_at_inventory_records
    BEFORE UPDATE ON inventory_records
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Bind the reserved_quantity maintenance trigger to inventory_reservations
CREATE TRIGGER trigger_update_inventory_reserved_quantity
    AFTER INSERT OR UPDATE OR DELETE ON inventory_reservations
    FOR EACH ROW EXECUTE FUNCTION update_reserved_quantity_fn();
