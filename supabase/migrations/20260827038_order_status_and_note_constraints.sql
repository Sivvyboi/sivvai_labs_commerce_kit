-- =============================================================================
-- 20260827038_order_status_and_note_constraints.sql
--
-- Expand orders_status_check and order_notes_author_type_check constraints:
-- 1. orders_status_check: Allow all 8 domain lifecycle statuses:
--    'pending', 'confirmed', 'processing', 'shipped', 'delivered',
--    'completed', 'cancelled', 'refunded'.
-- 2. order_notes_author_type_check: Allow 'admin' and 'customer' alongside
--    'merchant', 'buyer', 'system'.
-- =============================================================================

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'));

ALTER TABLE order_notes DROP CONSTRAINT IF EXISTS order_notes_author_type_check;
ALTER TABLE order_notes ADD CONSTRAINT order_notes_author_type_check
  CHECK (author_type IN ('buyer', 'merchant', 'system', 'admin', 'customer'));
