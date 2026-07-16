-- Create product_status enum
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');

-- Create product_visibility enum
CREATE TYPE product_visibility AS ENUM ('public', 'hidden');

-- Create variant_status enum
CREATE TYPE variant_status AS ENUM ('active', 'archived');

-- Create stock_movement_type enum
CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment', 'allocation');

-- Create customer_status enum
CREATE TYPE customer_status AS ENUM ('active', 'blocked', 'guest');

-- Create cart_status enum
CREATE TYPE cart_status AS ENUM ('active', 'converted', 'expired');

-- Create checkout_status enum
CREATE TYPE checkout_status AS ENUM ('open', 'completed', 'expired');

-- Create fulfilment_type enum
CREATE TYPE fulfilment_type AS ENUM ('pickup', 'delivery', 'shipping');

-- Create shipping_rate_type enum
CREATE TYPE shipping_rate_type AS ENUM ('flat', 'weight_based', 'price_based');

-- Create order_status enum
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');

-- Create note_author_type enum
CREATE TYPE note_author_type AS ENUM ('customer', 'merchant', 'system');

-- Create payment_status enum
CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'failed', 'voided', 'refunded');

-- Create notification_channel enum
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'whatsapp');

-- Create notification_status enum
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

-- Create promotion_type enum
CREATE TYPE promotion_type AS ENUM ('percentage', 'fixed_amount', 'free_shipping');

-- Create reservation_status enum
-- active    → hold is live; stock is unavailable to other buyers
-- released  → hold was explicitly cancelled (e.g. item removed from cart)
-- expired   → hold timed out before checkout completed
-- converted → hold was consumed by an order (stock movement recorded)
CREATE TYPE reservation_status AS ENUM ('active', 'released', 'expired', 'converted');
