-- =============================================================================
-- 20260801022_team_invitations.sql
-- Admin Team Invitations
--
-- Creates:
--   admin_invitations table for tracking admin user invitations
-- =============================================================================

CREATE TYPE admin_invitation_status AS ENUM (
    'pending',
    'accepted',
    'expired',
    'revoked'
);

CREATE TABLE IF NOT EXISTS admin_invitations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT NOT NULL,
    role_id      UUID REFERENCES roles(id) ON DELETE SET NULL,
    invited_by   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    token        TEXT UNIQUE NOT NULL,
    status       admin_invitation_status NOT NULL DEFAULT 'pending',
    message      TEXT,
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    accepted_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON admin_invitations(status);

-- Enable RLS
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only Owners (manage_users permission) can view and manage invitations
CREATE POLICY "Admins with manage_users can manage invitations" ON admin_invitations
    FOR ALL TO authenticated
    USING (admin_has_permission('manage_users'))
    WITH CHECK (admin_has_permission('manage_users'));

-- Service role has full access
GRANT ALL PRIVILEGES ON admin_invitations TO service_role;
GRANT SELECT, INSERT, UPDATE ON admin_invitations TO authenticated;

-- Grants for the enum type
GRANT USAGE ON TYPE admin_invitation_status TO authenticated, service_role;
