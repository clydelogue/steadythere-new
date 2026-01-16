-- Migration: Add email invitation system
-- Allows inviting team members via email to org or specific events
-- NOTE: Made idempotent - skips if invitations table already exists

-- Create invitation status enum (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE invitation_status AS ENUM (
      'pending',
      'accepted',
      'expired',
      'cancelled'
    );
  END IF;
END $$;

-- Create invitations table only if it doesn't exist
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  email text NOT NULL,
  role org_role NOT NULL DEFAULT 'volunteer',
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes (IF NOT EXISTS not supported, use DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invitations_organization') THEN
    CREATE INDEX idx_invitations_organization ON invitations(organization_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invitations_email') THEN
    CREATE INDEX idx_invitations_email ON invitations(email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invitations_token') THEN
    CREATE INDEX idx_invitations_token ON invitations(token);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invitations_status') THEN
    CREATE INDEX idx_invitations_status ON invitations(status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invitations_event') THEN
    CREATE INDEX idx_invitations_event ON invitations(event_id) WHERE event_id IS NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_invitations_pending') THEN
    CREATE INDEX idx_invitations_pending ON invitations(organization_id, status) WHERE status = 'pending';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invitations' AND policyname = 'Org members can view org invitations') THEN
    CREATE POLICY "Org members can view org invitations"
      ON invitations FOR SELECT
      USING (is_org_member(auth.uid(), organization_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invitations' AND policyname = 'Admins can create invitations') THEN
    CREATE POLICY "Admins can create invitations"
      ON invitations FOR INSERT
      WITH CHECK (has_admin_access(auth.uid(), organization_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invitations' AND policyname = 'Admins can update invitations') THEN
    CREATE POLICY "Admins can update invitations"
      ON invitations FOR UPDATE
      USING (has_admin_access(auth.uid(), organization_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invitations' AND policyname = 'Admins can delete invitations') THEN
    CREATE POLICY "Admins can delete invitations"
      ON invitations FOR DELETE
      USING (has_admin_access(auth.uid(), organization_id));
  END IF;
END $$;

-- Function to check if an invitation is valid
CREATE OR REPLACE FUNCTION is_valid_invitation(invitation_token text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM invitations
    WHERE token = invitation_token
      AND status = 'pending'
      AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get invitation details by token
CREATE OR REPLACE FUNCTION get_invitation_by_token(invitation_token text)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  organization_name text,
  event_id uuid,
  event_name text,
  email text,
  role org_role,
  inviter_name text,
  inviter_email text,
  message text,
  expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.organization_id,
    o.name as organization_name,
    i.event_id,
    e.name as event_name,
    i.email,
    i.role::org_role,
    p.name as inviter_name,
    p.email as inviter_email,
    i.message,
    i.expires_at
  FROM invitations i
  JOIN organizations o ON o.id = i.organization_id
  JOIN profiles p ON p.id = i.invited_by
  LEFT JOIN events e ON e.id = i.event_id
  WHERE i.token = invitation_token
    AND i.status = 'pending'
    AND i.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token text, accepting_user_id uuid)
RETURNS json AS $$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv
  FROM invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = inv.organization_id
      AND user_id = accepting_user_id
  ) THEN
    UPDATE invitations
    SET status = 'accepted',
        accepted_at = now(),
        accepted_by = accepting_user_id
    WHERE id = inv.id;

    RETURN json_build_object('success', true, 'message', 'Already a member', 'organization_id', inv.organization_id);
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (inv.organization_id, accepting_user_id, inv.role::org_role);

  UPDATE invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = accepting_user_id
  WHERE id = inv.id;

  RETURN json_build_object(
    'success', true,
    'organization_id', inv.organization_id,
    'event_id', inv.event_id,
    'role', inv.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access for signup flow
GRANT EXECUTE ON FUNCTION is_valid_invitation(text) TO anon;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION accept_invitation(text, uuid) TO authenticated;

COMMENT ON TABLE invitations IS 'Email invitations for team members to join organizations or specific events';
