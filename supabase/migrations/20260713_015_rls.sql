-- Enable Row Level Security (RLS) on all tables
ALTER TABLE brand_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfilment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
-- NOTE: No policies created for inventory_reservations.
-- RLS enabled with zero policies = deny-all for anon and authenticated roles.
-- All reservation management is performed server-side via the service role key.

-- 1. Store Config Policies
CREATE POLICY "Allow public read-only access to brand_profile" ON brand_profile FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read-only access to store_settings" ON store_settings FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read-only access to feature_flags" ON feature_flags FOR SELECT TO public USING (true);

-- 2. Public Catalog Policies
CREATE POLICY "Allow public read for active categories" ON categories FOR SELECT TO public USING (archived_at IS NULL);
CREATE POLICY "Allow public read for active products" ON products FOR SELECT TO public USING (status = 'published' AND visibility = 'public' AND archived_at IS NULL);
CREATE POLICY "Allow public read for collections" ON collections FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read for tags" ON tags FOR SELECT TO public USING (true);

-- 3. Product Sub-table Policies (dependent on product visibility)
CREATE POLICY "Allow public read for images of public products" ON product_images FOR SELECT TO public USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = product_images.product_id
          AND products.status = 'published'
          AND products.visibility = 'public'
          AND products.archived_at IS NULL
    )
);

CREATE POLICY "Allow public read for options of public products" ON option_groups FOR SELECT TO public USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = option_groups.product_id
          AND products.status = 'published'
          AND products.visibility = 'public'
          AND products.archived_at IS NULL
    )
);

CREATE POLICY "Allow public read for option values of public products" ON option_values FOR SELECT TO public USING (
    EXISTS (
        SELECT 1 FROM option_groups
        JOIN products ON products.id = option_groups.product_id
        WHERE option_groups.id = option_values.option_group_id
          AND products.status = 'published'
          AND products.visibility = 'public'
          AND products.archived_at IS NULL
    )
);

CREATE POLICY "Allow public read for variants of public products" ON product_variants FOR SELECT TO public USING (
    EXISTS (
        SELECT 1 FROM products
        WHERE products.id = product_variants.product_id
          AND products.status = 'published'
          AND products.visibility = 'public'
          AND products.archived_at IS NULL
    )
);

-- 4. Join Tables Policies
CREATE POLICY "Allow public read for product_tags" ON product_tags FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read for collection_products" ON collection_products FOR SELECT TO public USING (true);

-- 5. Inventory Policies
CREATE POLICY "Allow public read for inventory of public products" ON inventory_records FOR SELECT TO public USING (
    EXISTS (
        SELECT 1 FROM product_variants
        JOIN products ON products.id = product_variants.product_id
        WHERE product_variants.id = inventory_records.variant_id
          AND products.status = 'published'
          AND products.visibility = 'public'
          AND products.archived_at IS NULL
    )
);

CREATE POLICY "Allow auth read for stock movements of own orders" ON stock_movements FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM orders
        JOIN customers ON customers.id = orders.customer_id
        WHERE orders.id = stock_movements.reference_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);

-- 6. Customers Policies
CREATE POLICY "Allow users to read own profile" ON customers FOR SELECT TO authenticated USING (auth_id = (SELECT auth.uid()));
CREATE POLICY "Allow users to insert own profile" ON customers FOR INSERT TO authenticated WITH CHECK (auth_id = (SELECT auth.uid()));
CREATE POLICY "Allow users to update own profile" ON customers FOR UPDATE TO authenticated USING (auth_id = (SELECT auth.uid())) WITH CHECK (auth_id = (SELECT auth.uid()));

CREATE POLICY "Allow users to read own addresses" ON customer_addresses FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = customer_addresses.customer_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);
CREATE POLICY "Allow users to insert own addresses" ON customer_addresses FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = customer_addresses.customer_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);
CREATE POLICY "Allow users to update own addresses" ON customer_addresses FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = customer_addresses.customer_id
          AND customers.auth_id = (SELECT auth.uid())
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = customer_addresses.customer_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);
CREATE POLICY "Allow users to delete own addresses" ON customer_addresses FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = customer_addresses.customer_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);

-- 7. Carts & Cart Lines Policies
CREATE POLICY "Allow public read/write access to own cart" ON carts FOR ALL TO public USING (
    customer_id IS NULL OR
    EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = carts.customer_id
          AND customers.auth_id = (SELECT auth.uid())
    )
) WITH CHECK (
    customer_id IS NULL OR
    EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = carts.customer_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Allow public read/write access to own cart lines" ON cart_lines FOR ALL TO public USING (
    EXISTS (
        SELECT 1 FROM carts
        WHERE carts.id = cart_lines.cart_id
          AND (
            carts.customer_id IS NULL OR
            EXISTS (
                SELECT 1 FROM customers
                WHERE customers.id = carts.customer_id
                  AND customers.auth_id = (SELECT auth.uid())
            )
          )
      )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM carts
        WHERE carts.id = cart_lines.cart_id
          AND (
            carts.customer_id IS NULL OR
            EXISTS (
                SELECT 1 FROM customers
                WHERE customers.id = carts.customer_id
                  AND customers.auth_id = (SELECT auth.uid())
            )
          )
      )
);

-- 8. Checkout Policies
CREATE POLICY "Allow public access to own checkout session" ON checkout_sessions FOR ALL TO public USING (
    EXISTS (
        SELECT 1 FROM carts
        WHERE carts.id = checkout_sessions.cart_id
          AND (
            carts.customer_id IS NULL OR
            EXISTS (
                SELECT 1 FROM customers
                WHERE customers.id = carts.customer_id
                  AND customers.auth_id = (SELECT auth.uid())
            )
          )
      )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM carts
        WHERE carts.id = checkout_sessions.cart_id
          AND (
            carts.customer_id IS NULL OR
            EXISTS (
                SELECT 1 FROM customers
                WHERE customers.id = carts.customer_id
                  AND customers.auth_id = (SELECT auth.uid())
            )
          )
      )
);

-- 9. Shipping Policies
CREATE POLICY "Allow public read for enabled fulfilment methods" ON fulfilment_methods FOR SELECT TO public USING (is_enabled = TRUE);
CREATE POLICY "Allow public read for shipping zones" ON shipping_zones FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read for shipping rates" ON shipping_rates FOR SELECT TO public USING (true);

-- 10. Orders & Order Lines Policies
CREATE POLICY "Allow users to read own orders" ON orders FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = orders.customer_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Allow users to read own order lines" ON order_lines FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM orders
        JOIN customers ON customers.id = orders.customer_id
        WHERE orders.id = order_lines.order_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Allow users to read own order status events" ON order_status_events FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM orders
        JOIN customers ON customers.id = orders.customer_id
        WHERE orders.id = order_status_events.order_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Allow users to read own order notes" ON order_notes FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM orders
        JOIN customers ON customers.id = orders.customer_id
        WHERE orders.id = order_notes.order_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);

-- 11. Payments Policies
CREATE POLICY "Allow users to read own payment attempts" ON payment_attempts FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM orders
        JOIN customers ON customers.id = orders.customer_id
        WHERE orders.id = payment_attempts.order_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Allow users to read own payment events" ON payment_events FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM payment_attempts
        JOIN orders ON orders.id = payment_attempts.order_id
        JOIN customers ON customers.id = orders.customer_id
        WHERE payment_attempts.id = payment_events.payment_attempt_id
          AND customers.auth_id = (SELECT auth.uid())
    )
);

-- 12. Notifications Policies (Service Role / Server only, no public policy)

-- 13. Promotions Policies
CREATE POLICY "Allow public read for active promotions" ON promotions FOR SELECT TO public USING (is_active = TRUE);
CREATE POLICY "Allow public read for coupon codes" ON coupon_codes FOR SELECT TO public USING (true);
