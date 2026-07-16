-- Seed brand_profile
INSERT INTO brand_profile (id, name, logo_url, seo_title)
VALUES ('00000000-0000-0000-0000-000000000000'::UUID, 'Sivvai Labs Store', 'https://example.com/logo.png', 'Best Social Commerce Store')
ON CONFLICT (id) DO NOTHING;

-- Seed store_settings
INSERT INTO store_settings (id, currency, tax_mode, active_payment_provider)
VALUES ('00000000-0000-0000-0000-000000000000'::UUID, 'NGN', 'inclusive', NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed feature_flags
INSERT INTO feature_flags (key, enabled, metadata)
VALUES 
  ('enable-promotions', FALSE, NULL),
  ('enable-reviews', FALSE, NULL),
  ('enable-loyalty', FALSE, NULL)
ON CONFLICT (key) DO NOTHING;

-- Seed fulfilment_methods
INSERT INTO fulfilment_methods (id, type, name, is_enabled, estimated_days_min, estimated_days_max)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::UUID, 'pickup', 'Store Pickup', FALSE, 0, 1),
  ('22222222-2222-2222-2222-222222222222'::UUID, 'delivery', 'Local Delivery', FALSE, 1, 2),
  ('33333333-3333-3333-3333-333333333333'::UUID, 'shipping', 'Nationwide Courier', FALSE, 3, 5)
ON CONFLICT (id) DO NOTHING;

-- Seed shipping_zones
INSERT INTO shipping_zones (id, name, regions)
VALUES 
  ('44444444-4444-4444-4444-444444444444'::UUID, 'Lagos State', ARRAY['NG-LA']),
  ('55555555-5555-5555-5555-555555555555'::UUID, 'Rest of Nigeria', ARRAY['NG-FC', 'NG-AB', 'NG-AK', 'NG-AN', 'NG-BA', 'NG-BY', 'NG-BE', 'NG-BO', 'NG-CR', 'NG-DE', 'NG-EB', 'NG-ED', 'NG-EK', 'NG-EN', 'NG-GO', 'NG-IM', 'NG-JI', 'NG-KD', 'NG-KN', 'NG-KT', 'NG-KE', 'NG-KO', 'NG-KW', 'NG-NA', 'NG-NI', 'NG-OG', 'NG-ON', 'NG-OS', 'NG-OY', 'NG-PL', 'NG-RI', 'NG-SO', 'NG-TA', 'NG-YO', 'NG-ZA'])
ON CONFLICT (id) DO NOTHING;

-- Seed shipping_rates
INSERT INTO shipping_rates (id, fulfilment_method_id, zone_id, rate_type, flat_amount, per_kg_amount, free_above_order_total)
VALUES
  ('66666666-6666-6666-6666-666666666666'::UUID, '22222222-2222-2222-2222-222222222222'::UUID, '44444444-4444-4444-4444-444444444444'::UUID, 'flat', 250000, 0, 5000000), -- 2,500 NGN
  ('77777777-7777-7777-7777-777777777777'::UUID, '33333333-3333-3333-3333-333333333333'::UUID, '55555555-5555-5555-5555-555555555555'::UUID, 'flat', 500000, 100000, 10000000) -- 5,000 NGN
ON CONFLICT (id) DO NOTHING;

-- Seed categories
INSERT INTO categories (id, name, slug)
VALUES ('88888888-8888-8888-8888-888888888888'::UUID, 'Apparel & Clothing', 'apparel-clothing')
ON CONFLICT (id) DO NOTHING;

-- Seed products
INSERT INTO products (id, category_id, slug, name, description, status, visibility, base_price, is_featured)
VALUES 
  ('99999999-9999-9999-9999-999999999999'::UUID, '88888888-8888-8888-8888-888888888888'::UUID, 'demo-t-shirt', 'Demo T-Shirt', 'A classic, durable cotton blend T-shirt.', 'published', 'public', 1250000, TRUE),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, '88888888-8888-8888-8888-888888888888'::UUID, 'premium-hoodie', 'Premium Hoodie', 'Soft, warm, and comfortable heavy-weight fleece hoodie.', 'published', 'public', 2500000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed option_groups for Premium Hoodie
INSERT INTO option_groups (id, product_id, name, display_order)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'Size', 0)
ON CONFLICT (id) DO NOTHING;

-- Seed option_values for Premium Hoodie Size
INSERT INTO option_values (id, option_group_id, label, display_order, swatch_type, swatch_value)
VALUES 
  ('dddddddd-dddd-dddd-dddd-dddddddddddd'::UUID, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID, 'M', 0, 'none', NULL),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::UUID, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID, 'L', 1, 'none', NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed product_variants
INSERT INTO product_variants (id, product_id, sku, option_combination, price_override, is_default, status)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID, '99999999-9999-9999-9999-999999999999'::UUID, 'DEMO-TSHIRT', '{}'::JSONB, NULL, TRUE, 'active'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'HOODIE-M', '{"Size": "M"}'::JSONB, NULL, TRUE, 'active'),
  ('00000000-1111-2222-3333-444455556666'::UUID, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'HOODIE-L', '{"Size": "L"}'::JSONB, 2800000, FALSE, 'active')
ON CONFLICT (id) DO NOTHING;

-- Seed inventory_records
INSERT INTO inventory_records (variant_id, on_hand_quantity, reserved_quantity, incoming_quantity, low_stock_threshold, track_inventory, allow_backorders)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID, 100, 0, 0, 5, TRUE, FALSE),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID, 50, 0, 0, 5, TRUE, FALSE),
  ('00000000-1111-2222-3333-444455556666'::UUID, 30, 0, 0, 5, TRUE, FALSE)
ON CONFLICT (variant_id) DO NOTHING;
