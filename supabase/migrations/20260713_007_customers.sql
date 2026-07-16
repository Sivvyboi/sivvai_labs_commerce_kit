-- Create customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    status customer_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create customer_addresses table
CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    label TEXT, -- e.g. 'Home', 'Office'
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    street_line_1 TEXT NOT NULL,
    street_line_2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT,
    country TEXT NOT NULL DEFAULT 'NG',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_customer_addresses_updated_at
BEFORE UPDATE ON customer_addresses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger to enforce only one default address per customer
CREATE OR REPLACE FUNCTION enforce_default_customer_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE customer_addresses
        SET is_default = FALSE
        WHERE customer_id = NEW.customer_id AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enforce_default_customer_address
BEFORE INSERT OR UPDATE OF is_default ON customer_addresses
FOR EACH ROW
EXECUTE FUNCTION enforce_default_customer_address();

-- Extra Indexes from Section 5
CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);
