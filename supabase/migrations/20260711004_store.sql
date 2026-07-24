-- =============================================================================
-- 004_store.sql
-- Store-wide configuration singletons and feature flags.
-- =============================================================================

-- Brand Profile (Singleton)
CREATE TABLE IF NOT EXISTS brand_profile (
    id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    name text NOT NULL,
    logo_url text,
    contact_email email_address NOT NULL,
    contact_phone phone_number,
    seo_title text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT brand_profile_singleton CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

-- Store Settings (Singleton)
CREATE TABLE IF NOT EXISTS store_settings (
    id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    currency currency_code NOT NULL DEFAULT 'NGN',
    tax_mode text NOT NULL DEFAULT 'inclusive' CHECK (tax_mode IN ('inclusive', 'exclusive')),
    active_payment_provider text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT store_settings_singleton CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

-- Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    enabled boolean NOT NULL DEFAULT false,
    metadata jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Attach update triggers
CREATE TRIGGER set_updated_at_brand_profile
    BEFORE UPDATE ON brand_profile
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_store_settings
    BEFORE UPDATE ON store_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_feature_flags
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
