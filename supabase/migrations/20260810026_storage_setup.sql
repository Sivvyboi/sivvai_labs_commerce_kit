-- =============================================================================
-- 20260810026_storage_setup.sql
-- Create product-images storage bucket & define RLS access policies.
-- =============================================================================

-- 1. Create product-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage RLS Policies for product-images bucket
-- Public read access
CREATE POLICY "Public Read Product Images" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'product-images');

-- Admin write access (authenticated admins with manage_products permission)
CREATE POLICY "Admins Insert Product Images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'product-images'
        AND private.admin_has_permission('manage_products')
    );

CREATE POLICY "Admins Update Product Images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'product-images'
        AND private.admin_has_permission('manage_products')
    )
    WITH CHECK (
        bucket_id = 'product-images'
        AND private.admin_has_permission('manage_products')
    );

CREATE POLICY "Admins Delete Product Images" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'product-images'
        AND private.admin_has_permission('manage_products')
    );
