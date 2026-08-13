-- =============================================================================
-- 20260813030_checkout_totals.sql
-- Add locked total columns to checkout_sessions table
-- =============================================================================

ALTER TABLE checkout_sessions
  ADD COLUMN IF NOT EXISTS subtotal INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';
