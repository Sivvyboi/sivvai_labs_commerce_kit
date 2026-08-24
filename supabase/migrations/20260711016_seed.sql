-- =============================================================================
-- 016_seed.sql
-- Seed Initial Store Data, Demo Products, Shipping Config, and Feature Flags.
-- Designed to be fully idempotent and safe to re-run.
-- =============================================================================

-- 1. Brand Profile
INSERT INTO brand_profile (id, name, logo_url, contact_email, contact_phone, seo_title)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Sivvai Labs Store',
    null,
    'support@sivvai.com',
    '+2348012345678',
    'Sivvai Labs Store - High Quality Social Commerce'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    contact_email = EXCLUDED.contact_email,
    contact_phone = EXCLUDED.contact_phone,
    seo_title = EXCLUDED.seo_title;

-- 2. Store Settings
INSERT INTO store_settings (id, currency, tax_mode, active_payment_provider)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'NGN',
    'inclusive',
    'paystack'
)
ON CONFLICT (id) DO UPDATE SET
    currency = EXCLUDED.currency,
    tax_mode = EXCLUDED.tax_mode,
    active_payment_provider = EXCLUDED.active_payment_provider;

-- 3. Feature Flags
INSERT INTO feature_flags (key, enabled)
VALUES 
    ('feature.auth', false),
    ('feature.cart', false),
    ('feature.search', false),
    ('feature.reviews', false),
    ('feature.wishlist', false),
    ('feature.whatsappCheckout', false)
ON CONFLICT (key) DO NOTHING;

-- 4. Categories
INSERT INTO categories (id, name, slug)
VALUES ('c1a551f1-ca70-4b2a-89a5-aa33bb44cc55'::uuid, 'Apparel & Fashion', 'apparel-fashion')
ON CONFLICT (id) DO NOTHING;

-- 8. Products
-- 35,000 NGN (3,500,000 kobo) base price, 20,000 NGN cost price
INSERT INTO products (id, category_id, slug, name, description, status, visibility, base_price, cost_price, is_featured)
VALUES (
    '00000000-0000-0000-0000-000000010000'::uuid,
    'c1a551f1-ca70-4b2a-89a5-aa33bb44cc55'::uuid,
    'ankara-agbada-set',
    'Ankara Agbada Set',
    'Premium handcrafted Ankara Agbada set with matching trousers. Ideal for traditional ceremonies.',
    'published',
    'public',
    3500000,
    2000000,
    true
)
ON CONFLICT (id) DO NOTHING;

-- 20,000 NGN (2,000,000 kobo) base price, 10,000 NGN cost price
INSERT INTO products (id, category_id, slug, name, description, status, visibility, base_price, cost_price, is_featured)
VALUES (
    '00000000-0000-0000-0000-000000020000'::uuid,
    'c1a551f1-ca70-4b2a-89a5-aa33bb44cc55'::uuid,
    'plain-kaftan',
    'Plain Kaftan',
    'Classic breathable Kaftan with minimalist embroidery. Perfect for everyday wear.',
    'published',
    'public',
    2000000,
    1000000,
    false
)
ON CONFLICT (id) DO NOTHING;

-- 9. Product Variants (Default variants for demo products)
INSERT INTO product_variants (id, product_id, sku, is_default, status)
VALUES
    ('00000000-0000-0000-0000-000001000000'::uuid, '00000000-0000-0000-0000-000000010000'::uuid, 'ANK-AGB-01', true, 'active'),
    ('00000000-0000-0000-0000-000002000000'::uuid, '00000000-0000-0000-0000-000000020000'::uuid, 'KAF-PLN-01', true, 'active')
ON CONFLICT (id) DO NOTHING;

-- 10. Inventory Records
INSERT INTO inventory_records (id, variant_id, on_hand_quantity, low_stock_threshold, track_inventory)
VALUES
    ('00000000-0000-0000-0000-000010000000'::uuid, '00000000-0000-0000-0000-000001000000'::uuid, 50, 5, true),
    ('00000000-0000-0000-0000-000020000000'::uuid, '00000000-0000-0000-0000-000002000000'::uuid, 100, 10, true)
ON CONFLICT (id) DO NOTHING;
