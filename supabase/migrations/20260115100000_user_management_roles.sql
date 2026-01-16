-- Migration: Add new organization roles for user management
-- NOTE: This migration may be redundant if 20260115035513 already ran
-- Check if migration is needed (old enum values exist)

DO $$
BEGIN
  -- Check if we still have the old enum values
  -- If not, this migration was already done by a previous migration
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'owner'
    AND enumtypid = 'org_role'::regtype
  ) THEN
    RAISE NOTICE 'Role migration already completed, skipping';
    RETURN;
  END IF;

  -- If we get here, we need to do the migration
  -- Create the new enum type
  CREATE TYPE org_role_new AS ENUM (
    'org_admin',
    'event_manager',
    'vendor',
    'partner',
    'volunteer'
  );

  -- Add new column and migrate data
  ALTER TABLE organization_members ADD COLUMN role_new org_role_new;

  UPDATE organization_members
  SET role_new = CASE
    WHEN role::text IN ('owner', 'admin') THEN 'org_admin'::org_role_new
    ELSE 'volunteer'::org_role_new
  END;

  ALTER TABLE organization_members ALTER COLUMN role_new SET NOT NULL;
  ALTER TABLE organization_members DROP COLUMN role;
  ALTER TABLE organization_members RENAME COLUMN role_new TO role;

  DROP TYPE org_role CASCADE;
  ALTER TYPE org_role_new RENAME TO org_role;
END $$;

-- Ensure helper functions exist (idempotent)
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
