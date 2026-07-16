-- Create notification_templates table
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL UNIQUE,
    channel notification_channel NOT NULL,
    subject_template TEXT,
    body_template TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_notification_templates_updated_at
BEFORE UPDATE ON notification_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create notification_logs table
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    channel notification_channel NOT NULL,
    recipient TEXT NOT NULL,
    status notification_status NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trigger_notification_logs_updated_at
BEFORE UPDATE ON notification_logs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for FK performance
CREATE INDEX idx_notification_logs_order_id ON notification_logs(order_id);
CREATE INDEX idx_notification_logs_customer_id ON notification_logs(customer_id);
