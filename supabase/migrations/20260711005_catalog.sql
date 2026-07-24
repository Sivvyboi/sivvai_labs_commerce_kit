-- =============================================================================
-- 005_catalog.sql
-- Catalog Domain: categories, products, variants, collections, and tags.
-- =============================================================================

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    archived_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    slug text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'hidden')),
    published_at timestamptz,
    base_price money_amount NOT NULL,
    sale_price money_amount,
    compare_at_price money_amount,
    cost_price money_amount,
    is_featured boolean NOT NULL DEFAULT false,
    seo_title text,
    seo_description text,
    archived_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Product Images
CREATE TABLE IF NOT EXISTS product_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    url text NOT NULL,
    alt_text text,
    display_order integer NOT NULL DEFAULT 0,
    is_primary boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Option Groups (dimensions, e.g. Size, Color)
CREATE TABLE IF NOT EXISTS option_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    CONSTRAINT uq_product_option_group UNIQUE (product_id, name)
);

-- Option Values (values, e.g. M, L, XL or Red, Blue)
CREATE TABLE IF NOT EXISTS option_values (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    option_group_id uuid REFERENCES option_groups(id) ON DELETE CASCADE NOT NULL,
    label text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    swatch_type text CHECK (swatch_type IN ('color', 'image', 'none')),
    swatch_value text,
    CONSTRAINT uq_option_group_value UNIQUE (option_group_id, label)
);

-- Product Variants (purchasable atom)
CREATE TABLE IF NOT EXISTS product_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    image_id uuid REFERENCES product_images(id) ON DELETE SET NULL,
    sku text UNIQUE,
    option_combination jsonb NOT NULL DEFAULT '{}',
    price_override money_amount,
    is_default boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    archived_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Collections
CREATE TABLE IF NOT EXISTS collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    name text NOT NULL
);

-- Product Tags (Join table)
CREATE TABLE IF NOT EXISTS product_tags (
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    tag_id uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (product_id, tag_id)
);

-- Collection Products (Join table)
CREATE TABLE IF NOT EXISTS collection_products (
    collection_id uuid REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_list ON products(status, visibility);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_active ON products(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- Full-Text Search GIN index
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_categories
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_products
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_product_images
    BEFORE UPDATE ON product_images
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_product_variants
    BEFORE UPDATE ON product_variants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_collections
    BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
