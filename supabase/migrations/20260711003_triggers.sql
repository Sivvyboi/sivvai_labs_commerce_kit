-- =============================================================================
-- 003_triggers.sql
-- Create trigger functions to be used across multiple tables.
-- =============================================================================

-- Utility function to auto-update updated_at columns
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to keep inventory_records.reserved_quantity in sync
CREATE OR REPLACE FUNCTION update_reserved_quantity_fn()
RETURNS TRIGGER AS $$
DECLARE
    target_record_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_record_id := OLD.inventory_record_id;
    ELSE
        target_record_id := NEW.inventory_record_id;
    END IF;

    IF target_record_id IS NOT NULL THEN
        UPDATE inventory_records
        SET reserved_quantity = COALESCE(
            (SELECT SUM(quantity) 
             FROM inventory_reservations 
             WHERE inventory_record_id = target_record_id 
               AND status = 'active' 
               AND expires_at > now()), 
            0
        )
        WHERE id = target_record_id;
    END IF;

    -- Handle case where update shifted reservation to a different inventory record
    IF TG_OP = 'UPDATE' AND OLD.inventory_record_id IS DISTINCT FROM NEW.inventory_record_id THEN
        IF OLD.inventory_record_id IS NOT NULL THEN
            UPDATE inventory_records
            SET reserved_quantity = COALESCE(
                (SELECT SUM(quantity) 
                 FROM inventory_reservations 
                 WHERE inventory_record_id = OLD.inventory_record_id 
                   AND status = 'active' 
                   AND expires_at > now()), 
                0
            )
            WHERE id = OLD.inventory_record_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
