-- =============================================================================
-- 002_enums.sql
-- Define all global custom types (ENUMs) and PostgreSQL Domains.
-- =============================================================================

-- ENUMs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reservation_status') THEN
        CREATE TYPE reservation_status AS ENUM ('active', 'released', 'converted');
    END IF;
END$$;

-- DOMAINs
-- ISO 4217 Currency Codes (e.g. NGN, USD, GBP)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_code') THEN
        CREATE DOMAIN currency_code AS varchar(3)
        CHECK (VALUE ~ '^[A-Z]{3}$');
    END IF;
END$$;

-- ISO 3166-1 Alpha-2 Country Codes (e.g. NG, US, GB)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'country_code') THEN
        CREATE DOMAIN country_code AS varchar(2)
        CHECK (VALUE ~ '^[A-Z]{2}$');
    END IF;
END$$;

-- E.164 phone numbers (e.g. +2348012345678)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'phone_number') THEN
        CREATE DOMAIN phone_number AS varchar(30)
        CHECK (VALUE ~ '^\+[1-9]\d{1,29}$');
    END IF;
END$$;

-- Standard structural email address verification
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_address') THEN
        CREATE DOMAIN email_address AS varchar(254)
        CHECK (VALUE ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
    END IF;
END$$;

-- Non-negative monetary amounts in minor units (e.g. kobo, cents)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'money_amount') THEN
        CREATE DOMAIN money_amount AS bigint
        CHECK (VALUE >= 0);
    END IF;
END$$;

-- Non-negative inventory quantities
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_quantity') THEN
        CREATE DOMAIN inventory_quantity AS integer
        CHECK (VALUE >= 0);
    END IF;
END$$;
