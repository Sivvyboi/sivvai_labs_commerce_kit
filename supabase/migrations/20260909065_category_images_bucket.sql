-- =============================================================================
-- 20260909065_category_images_bucket.sql
-- Catalog Domain: Category Images Storage Bucket & RLS Policies
--
-- Creates a dedicated public bucket for category images.
-- Write access is restricted to admins with `manage_categories` permission,
-- matching the same permission gate used for all category CRUD operations.
-- =============================================================================

-- 1. Create the category-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'category-images',
    'category-images',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public         = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Public read access
CREATE POLICY "Public Read Category Images" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'category-images');

-- 3. Admin write access — guarded by manage_categories permission
CREATE POLICY "Admins Insert Category Images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'category-images'
        AND private.admin_has_permission('manage_categories')
    );

CREATE POLICY "Admins Update Category Images" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'category-images'
        AND private.admin_has_permission('manage_categories')
    )
    WITH CHECK (
        bucket_id = 'category-images'
        AND private.admin_has_permission('manage_categories')
    );

CREATE POLICY "Admins Delete Category Images" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'category-images'
        AND private.admin_has_permission('manage_categories')
    );
