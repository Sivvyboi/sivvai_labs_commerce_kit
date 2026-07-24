-- =============================================================================
-- 007_customers.sql
-- Customer Domain: customers and customer_addresses.
-- =============================================================================

-- Customers (linked to auth.users if registered)
CREATE TABLE IF NOT EXISTS customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    email email_address UNIQUE NOT NULL,
    phone phone_number,
    first_name text,
    last_name text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Customer Addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    label text NOT NULL DEFAULT 'Home',
    street_line_1 text NOT NULL,
    street_line_2 text,
    city text NOT NULL,
    state text NOT NULL,
    country country_code NOT NULL DEFAULT 'NG',
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Trigger function to enforce a single default address per customer
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE customer_addresses
        SET is_default = false
        WHERE customer_id = NEW.customer_id
          AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind default address trigger
CREATE TRIGGER trigger_single_default_address
    BEFORE INSERT OR UPDATE OF is_default ON customer_addresses
    FOR EACH ROW EXECUTE FUNCTION ensure_single_default_address();

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_customers
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_customer_addresses
    BEFORE UPDATE ON customer_addresses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
