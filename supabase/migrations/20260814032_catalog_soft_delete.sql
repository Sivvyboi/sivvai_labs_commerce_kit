-- =============================================================================
-- 20260814032_catalog_soft_delete.sql
-- Catalog Domain: Add soft-delete column to products table and index.
-- =============================================================================

-- 1. Add deleted_at column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Index for filtering out soft-deleted products in queries
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);

-- 3. Composite index for archived catalog queries
CREATE INDEX IF NOT EXISTS idx_products_archived_active ON products(archived_at DESC) 
    WHERE status = 'archived' AND deleted_at IS NULL;
