-- Migration: Add email invitation system
-- Allows inviting team members via email to org or specific events

-- Create invitation status enum
CREATE TYPE invitation_status AS ENUM (
  'pending',
  'accepted',
  'expired',
  'cancelled'
);

-- Create invitations table
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE, -- NULL means org-level invite
  email text NOT NULL,
  role org_role NOT NULL DEFAULT 'volunteer',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES profiles(id),
  message text, -- Optional personal message from inviter
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_invitations_organization ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_event ON invitations(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_invitations_pending ON invitations(organization_id, status) WHERE status = 'pending';

-- Add updated_at trigger
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Org members can view invitations for their org
CREATE POLICY "Org members can view org invitations"
  ON invitations FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    has_admin_access(auth.uid(), organization_id)
  );

-- Admins can update invitations (cancel, etc.)
CREATE POLICY "Admins can update invitations"
  ON invitations FOR UPDATE
  USING (has_admin_access(auth.uid(), organization_id));

-- Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  USING (has_admin_access(auth.uid(), organization_id));

-- Function to check if an invitation is valid (not expired, not used)
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

-- Function to get invitation details by token (public access for signup flow)
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
    i.role,
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
  result json;
BEGIN
  -- Get and lock the invitation
  SELECT * INTO inv
  FROM invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = inv.organization_id
      AND user_id = accepting_user_id
  ) THEN
    -- Update invitation as accepted anyway
    UPDATE invitations
    SET status = 'accepted',
        accepted_at = now(),
        accepted_by = accepting_user_id
    WHERE id = inv.id;

    RETURN json_build_object('success', true, 'message', 'Already a member', 'organization_id', inv.organization_id);
  END IF;

  -- Add user as organization member
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (inv.organization_id, accepting_user_id, inv.role);

  -- Update invitation status
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

-- Allow unauthenticated access to check invitation validity
-- (needed for signup flow)
GRANT EXECUTE ON FUNCTION is_valid_invitation(text) TO anon;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION accept_invitation(text, uuid) TO authenticated;

-- Add comment
COMMENT ON TABLE invitations IS 'Email invitations for team members to join organizations or specific events';
