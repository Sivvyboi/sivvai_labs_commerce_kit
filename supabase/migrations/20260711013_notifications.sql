-- =============================================================================
-- 013_notifications.sql
-- Notifications Domain: templates and activity logs.
-- =============================================================================

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text UNIQUE NOT NULL, -- e.g. 'order.created', 'order.shipped'
    channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
    subject_template text,
    body_template text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Notification Logs (audit record of sent messages)
CREATE TABLE IF NOT EXISTS notification_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
    channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms')),
    recipient text NOT NULL, -- Phone number or email
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_customer ON notification_logs(customer_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_notification_templates
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
