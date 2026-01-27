-- Migration: Fix RLS policies to use new role enum values
-- The initial migration created policies using 'owner' and 'admin' roles
-- but those were migrated to 'org_admin', 'event_manager', etc.
-- This migration updates all RLS policies to use the correct role values.

-- Drop old policies that reference invalid role values
DROP POLICY IF EXISTS "Org owners/admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org owners/admins can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Org owners/admins can manage event types" ON public.event_types;
DROP POLICY IF EXISTS "Org owners/admins can manage milestone templates" ON public.milestone_templates;
DROP POLICY IF EXISTS "Org owners/admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Org owners/admins can delete documents" ON public.documents;
DROP POLICY IF EXISTS "Org owners/admins can manage learned patterns" ON public.learned_patterns;

-- Helper function for admin check (idempotent)
CREATE OR REPLACE FUNCTION public.is_org_admin_or_manager(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('org_admin', 'event_manager')
  )
$$;

-- Helper function for org admin only check
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'org_admin'
  )
$$;

-- Recreate Organizations policies
CREATE POLICY "Org admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (public.is_org_admin(auth.uid(), id));

-- Recreate Organization members policies
CREATE POLICY "Org admins can manage members"
  ON public.organization_members FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Recreate Event types policies
CREATE POLICY "Org admins can manage event types"
  ON public.event_types FOR ALL
  USING (public.is_org_admin_or_manager(auth.uid(), organization_id));

-- Recreate Milestone templates policies
CREATE POLICY "Org admins can manage milestone templates"
  ON public.milestone_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_types et
      WHERE et.id = event_type_id
        AND public.is_org_admin_or_manager(auth.uid(), et.organization_id)
    )
  );

-- Recreate Events delete policy
CREATE POLICY "Org admins can delete events"
  ON public.events FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Recreate Documents delete policy
CREATE POLICY "Org admins can delete documents"
  ON public.documents FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Recreate Learned patterns policies
CREATE POLICY "Org admins can manage learned patterns"
  ON public.learned_patterns FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Verify the enum has correct values (informational)
DO $$
DECLARE
  role_values TEXT;
BEGIN
  SELECT string_agg(enumlabel, ', ') INTO role_values
  FROM pg_enum
  WHERE enumtypid = 'org_role'::regtype;

  RAISE NOTICE 'Current org_role enum values: %', role_values;
END $$;
