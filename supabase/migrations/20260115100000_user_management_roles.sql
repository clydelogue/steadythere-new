-- Migration: Add new organization roles for user management
-- Roles: org_admin, event_manager, vendor, partner, volunteer

-- First, create the new enum type (we'll rename to avoid conflicts)
CREATE TYPE org_role_new AS ENUM (
  'org_admin',      -- Can create, edit, archive the organization
  'event_manager',  -- Can create new events and do all event related activities
  'vendor',         -- Can see activities and report on actions and edit their activities
  'partner',        -- Can see activities and report on actions and edit their activities
  'volunteer'       -- Can see activities and report on actions and edit their activities
);

-- Migrate existing data to new roles
-- owner and admin -> org_admin
-- member -> volunteer
ALTER TABLE organization_members
  ADD COLUMN role_new org_role_new;

UPDATE organization_members
SET role_new = CASE
  WHEN role IN ('owner', 'admin') THEN 'org_admin'::org_role_new
  ELSE 'volunteer'::org_role_new
END;

-- Make the new column not null after populating
ALTER TABLE organization_members
  ALTER COLUMN role_new SET NOT NULL;

-- Drop the old column and rename
ALTER TABLE organization_members DROP COLUMN role;
ALTER TABLE organization_members RENAME COLUMN role_new TO role;

-- Drop old enum and rename new one
DROP TYPE org_role;
ALTER TYPE org_role_new RENAME TO org_role;

-- Update the has_org_role function to work with the new roles
CREATE OR REPLACE FUNCTION has_org_role(_user_id uuid, _org_id uuid, _role org_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user has admin-level access (org_admin or event_manager)
CREATE OR REPLACE FUNCTION has_admin_access(_user_id uuid, _org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('org_admin', 'event_manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user can manage organization settings
CREATE OR REPLACE FUNCTION can_manage_org(_user_id uuid, _org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'org_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user can manage events
CREATE OR REPLACE FUNCTION can_manage_events(_user_id uuid, _org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('org_admin', 'event_manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment to describe the roles
COMMENT ON TYPE org_role IS 'Organization member roles:
  org_admin - Full administrative access, can create/edit/archive organization
  event_manager - Can create and manage all events
  vendor - External vendor with limited access to view and update their activities
  partner - Partner organization with limited access to view and update their activities
  volunteer - Volunteer with limited access to view and update their activities';
