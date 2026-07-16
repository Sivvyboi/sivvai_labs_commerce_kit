-- Create inventory_records table
CREATE TABLE inventory_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
    on_hand_quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    incoming_quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
    allow_backorders BOOLEAN NOT NULL DEFAULT FALSE,
    available_quantity INT GENERATED ALWAYS AS (on_hand_quantity - reserved_quantity) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_inventory_records_updated_at
BEFORE UPDATE ON inventory_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create stock_movements table
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_record_id UUID NOT NULL REFERENCES inventory_records(id) ON DELETE RESTRICT,
    movement_type stock_movement_type NOT NULL,
    quantity_delta INT NOT NULL,
    reason TEXT,
    reference_id UUID,
    performed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_stock_movements_updated_at
BEFORE UPDATE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Extra Indexes from Section 5
CREATE INDEX idx_stock_movements_inventory_record_id ON stock_movements(inventory_record_id);

-- ---------------------------------------------------------------------------
-- inventory_reservations
-- ---------------------------------------------------------------------------
-- Tracks temporary stock holds placed during checkout and payment windows.
-- This table is the source of truth for what is "reserved" on a variant.
--
-- The trigger below keeps inventory_records.reserved_quantity in sync
-- automatically — application code must NOT write reserved_quantity directly.
--
-- Reference columns (cart_id, checkout_session_id, order_id) are plain UUIDs.
-- FK constraints are omitted here because the referenced tables (carts,
-- checkout_sessions, orders) are created in later migrations. Referential
-- integrity for these columns is enforced at the application layer.
-- ---------------------------------------------------------------------------

CREATE TABLE inventory_reservations (
    id                   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_record_id  UUID            NOT NULL REFERENCES inventory_records(id) ON DELETE RESTRICT,
    -- Soft references — one of these should be non-null per reservation context
    cart_id              UUID,           -- populated during cart hold
    checkout_session_id  UUID,           -- populated during payment-window hold
    order_id             UUID,           -- populated once order is created
    quantity             INT             NOT NULL CHECK (quantity > 0),
    status               reservation_status NOT NULL DEFAULT 'active',
    expires_at           TIMESTAMPTZ     NOT NULL,
    released_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_inventory_reservations_updated_at
BEFORE UPDATE ON inventory_reservations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Performance indexes
CREATE INDEX idx_inventory_reservations_record_id   ON inventory_reservations(inventory_record_id);
CREATE INDEX idx_inventory_reservations_cart_id     ON inventory_reservations(cart_id)            WHERE cart_id IS NOT NULL;
CREATE INDEX idx_inventory_reservations_checkout_id ON inventory_reservations(checkout_session_id) WHERE checkout_session_id IS NOT NULL;
CREATE INDEX idx_inventory_reservations_order_id    ON inventory_reservations(order_id)            WHERE order_id IS NOT NULL;
-- Partial index: fast lookup of all live holds for a given inventory record
CREATE INDEX idx_inventory_reservations_active      ON inventory_reservations(inventory_record_id) WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- Trigger: sync inventory_records.reserved_quantity
-- ---------------------------------------------------------------------------
-- Rules:
--   INSERT  active        → +quantity
--   UPDATE  active→active → +/- delta if quantity changed
--   UPDATE  active→other  → -old.quantity  (hold released/expired/converted)
--   UPDATE  other→active  → +new.quantity  (re-activation, rare)
--   DELETE  active        → -old.quantity
-- Uses GREATEST(0, ...) to guard against negative reserved_quantity from
-- out-of-order operations.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_inventory_reservation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'active' THEN
            UPDATE inventory_records
            SET reserved_quantity = reserved_quantity + NEW.quantity
            WHERE id = NEW.inventory_record_id;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'active' AND NEW.status = 'active' THEN
            -- Both active: apply quantity delta
            IF OLD.quantity <> NEW.quantity THEN
                UPDATE inventory_records
                SET reserved_quantity = reserved_quantity + (NEW.quantity - OLD.quantity)
                WHERE id = NEW.inventory_record_id;
            END IF;
        ELSIF OLD.status = 'active' AND NEW.status <> 'active' THEN
            -- Hold released, expired, or converted
            UPDATE inventory_records
            SET reserved_quantity = GREATEST(0, reserved_quantity - OLD.quantity)
            WHERE id = NEW.inventory_record_id;
        ELSIF OLD.status <> 'active' AND NEW.status = 'active' THEN
            -- Re-activation (unusual path, e.g. manual admin correction)
            UPDATE inventory_records
            SET reserved_quantity = reserved_quantity + NEW.quantity
            WHERE id = NEW.inventory_record_id;
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'active' THEN
            UPDATE inventory_records
            SET reserved_quantity = GREATEST(0, reserved_quantity - OLD.quantity)
            WHERE id = OLD.inventory_record_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_inventory_reservation
AFTER INSERT OR UPDATE OR DELETE ON inventory_reservations
FOR EACH ROW EXECUTE FUNCTION sync_inventory_reservation();

