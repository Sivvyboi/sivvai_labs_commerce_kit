-- =============================================================================
-- 20260811027_catalog_fts.sql
-- Generated tsvector column for full-text product search.
-- Materializes name + description into a single GIN-indexed tsvector.
-- =============================================================================

-- Add generated tsvector column to products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
            setweight(to_tsvector('english', coalesce(seo_title, '')), 'C') ||
            setweight(to_tsvector('english', coalesce(seo_description, '')), 'D')
        ) STORED;

-- GIN index for performant full-text search
CREATE INDEX IF NOT EXISTS idx_products_search_vector
    ON products USING GIN(search_vector);

-- Supporting performance indexes for catalog listing queries
CREATE INDEX IF NOT EXISTS idx_products_status_created
    ON products(status, created_at DESC)
    WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_products_category_status
    ON products(category_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_featured
    ON products(is_featured, created_at DESC)
    WHERE is_featured = true;
