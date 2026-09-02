-- =============================================================================
-- 20260902049_harden_accept_admin_invitation_rpc.sql
-- Security Hardening:
-- 1. Restrict accept_admin_invitation_rpc execution strictly to service_role.
-- 2. Revoke execute privileges from PUBLIC, anon, and authenticated.
-- 3. Tighten protected Owner safeguard: protected owners are completely immune
--    from invitation-driven mutation/reactivation/state change.
-- =============================================================================

CREATE OR REPLACE FUNCTION accept_admin_invitation_rpc(
    p_token TEXT,
    p_auth_user_id UUID,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invitation RECORD;
    v_existing_admin RECORD;
    v_admin_id UUID;
    v_is_reactivated BOOLEAN := false;
BEGIN
    -- 1. Atomically lock and retrieve the invitation row
    SELECT id, email, role_id, status, expires_at
    INTO v_invitation
    FROM admin_invitations
    WHERE token = p_token
    FOR UPDATE;

    -- If no invitation matches the token
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invitation_invalid'
        );
    END IF;

    -- Check status (must be pending)
    IF v_invitation.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invitation_invalid'
        );
    END IF;

    -- Check expiration
    IF v_invitation.expires_at < now() THEN
        UPDATE admin_invitations
        SET status = 'expired'
        WHERE id = v_invitation.id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'invitation_expired'
        );
    END IF;

    -- Verify canonical email matches (case-insensitive, trimmed)
    IF lower(trim(p_email)) <> lower(trim(v_invitation.email)) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invitation_email_mismatch'
        );
    END IF;

    -- 2. Locate existing admin_users record by canonical auth_user_id with row lock
    SELECT id, is_active, is_protected_owner, role_id
    INTO v_existing_admin
    FROM admin_users
    WHERE auth_user_id = p_auth_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Case A — Brand-new admin user: create new admin_users record
        INSERT INTO admin_users (
            auth_user_id,
            role_id,
            is_active,
            is_protected_owner
        )
        VALUES (
            p_auth_user_id,
            v_invitation.role_id,
            true,
            false
        )
        RETURNING id INTO v_admin_id;

        v_is_reactivated := false;
    ELSE
        -- Case B & C — Existing admin record exists
        v_admin_id := v_existing_admin.id;

        -- Safeguard 1: Protected Owners are completely immune from invitation-driven mutation/reactivation
        IF v_existing_admin.is_protected_owner THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'owner_protected'
            );
        -- Safeguard 2: Already-active admins cannot be mutated via invitation
        ELSIF v_existing_admin.is_active THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'already_active'
            );
        ELSE
            -- Case B: Inactive existing regular admin -> Reactivate and apply invited role
            UPDATE admin_users
            SET
                is_active = true,
                role_id = v_invitation.role_id,
                updated_at = now()
            WHERE id = v_existing_admin.id;

            v_is_reactivated := true;
        END IF;
    END IF;

    -- 3. Consume the invitation atomically
    UPDATE admin_invitations
    SET
        status = 'accepted',
        accepted_at = now()
    WHERE id = v_invitation.id;

    -- 4. Record audit log entry in the same transaction
    INSERT INTO audit_logs (
        admin_user_id,
        action,
        entity_type,
        entity_id,
        metadata
    )
    VALUES (
        v_admin_id,
        CASE WHEN v_is_reactivated THEN 'admin_invitation.accepted_reactivated' ELSE 'admin_invitation.accepted' END,
        'admin_invitation',
        v_invitation.id::TEXT,
        jsonb_build_object(
            'email', v_invitation.email,
            'role_id', v_invitation.role_id,
            'is_reactivated', v_is_reactivated
        )
    );

    -- 5. Return success result
    RETURN jsonb_build_object(
        'success', true,
        'admin_id', v_admin_id,
        'is_reactivated', v_is_reactivated
    );
END;
$$;

-- Strict privilege boundary: service_role ONLY
REVOKE EXECUTE ON FUNCTION accept_admin_invitation_rpc(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_admin_invitation_rpc(TEXT, UUID, TEXT) TO service_role;
