-- Create categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status product_status NOT NULL DEFAULT 'draft',
    visibility product_visibility NOT NULL DEFAULT 'public',
    published_at TIMESTAMPTZ,
    base_price INT8 NOT NULL DEFAULT 0,
    sale_price INT8,
    compare_at_price INT8,
    cost_price INT8,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT[],
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create product_images table
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_product_images_updated_at
BEFORE UPDATE ON product_images
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create option_groups table
CREATE TABLE option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT product_option_group_unique UNIQUE (product_id, name)
);

CREATE TRIGGER trigger_option_groups_updated_at
BEFORE UPDATE ON option_groups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create option_values table
CREATE TABLE option_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    swatch_type TEXT CHECK (swatch_type IN ('color', 'image', 'none')),
    swatch_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT option_group_value_unique UNIQUE (option_group_id, label)
);

CREATE TRIGGER trigger_option_values_updated_at
BEFORE UPDATE ON option_values
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create product_variants table
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_id UUID REFERENCES product_images(id) ON DELETE SET NULL,
    sku TEXT UNIQUE,
    option_combination JSONB NOT NULL DEFAULT '{}'::jsonb,
    price_override INT8,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    status variant_status NOT NULL DEFAULT 'active',
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_product_variants_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create collections table
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create product_tags join table
CREATE TABLE product_tags (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

-- Create collection_products join table
CREATE TABLE collection_products (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, product_id)
);

-- Extra Indexes from Section 5
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status_visibility ON products(status, visibility);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_products_not_archived ON products(archived_at) WHERE archived_at IS NULL;
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

-- GIN Full Text Search Index for Products
CREATE INDEX idx_products_search ON products USING GIN (
    to_tsvector('english', name || ' ' || coalesce(description, ''))
);
