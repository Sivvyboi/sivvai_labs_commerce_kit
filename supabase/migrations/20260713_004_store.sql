-- Create brand_profile table
CREATE TABLE brand_profile (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
    name TEXT NOT NULL,
    logo_url TEXT,
    seo_title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT brand_profile_singleton CHECK (id = '00000000-0000-0000-0000-000000000000'::UUID)
);

CREATE TRIGGER trigger_brand_profile_updated_at
BEFORE UPDATE ON brand_profile
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create store_settings table
CREATE TABLE store_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    tax_mode TEXT NOT NULL DEFAULT 'inclusive',
    active_payment_provider TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT store_settings_singleton CHECK (id = '00000000-0000-0000-0000-000000000000'::UUID)
);

CREATE TRIGGER trigger_store_settings_updated_at
BEFORE UPDATE ON store_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create feature_flags table
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_feature_flags_updated_at
BEFORE UPDATE ON feature_flags
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
