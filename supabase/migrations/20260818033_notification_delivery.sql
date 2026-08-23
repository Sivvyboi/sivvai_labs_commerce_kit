-- =============================================================================
-- 20260818033_notification_delivery.sql
-- Notification Delivery: Enhancements to notification_logs and standard templates.
-- =============================================================================

-- Add failure logging, metadata, and idempotency key to notification_logs
ALTER TABLE notification_logs 
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Partial unique index for idempotency protection (allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_idempotency 
  ON notification_logs(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Seed standard notification templates idempotently
INSERT INTO notification_templates (event_type, channel, subject_template, body_template)
VALUES 
  (
    'order.created',
    'email',
    'Order Confirmation - {{order_number}}',
    'Thank you for your order! We have received order {{order_number}} for {{grand_total}}.'
  ),
  (
    'order.status_updated',
    'email',
    'Update on Order {{order_number}}',
    'Your order {{order_number}} status has been updated to {{status}}.'
  ),
  (
    'admin.invitation',
    'email',
    'You have been invited to join the Sivvai Commerce Admin Team',
    'You have been invited to join as {{role_name}}. Click here to accept your invitation: {{invite_url}}'
  )
ON CONFLICT (event_type) DO NOTHING;
