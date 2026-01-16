-- Migration: Fix RLS policy inconsistencies
--
-- Problem: After the role migration, some policies use has_org_role('org_admin')
-- while others use is_org_admin_or_manager(). This creates inconsistent permissions
-- where event_managers can manage templates but can't delete events.
--
-- Solution: Standardize all admin-level policies to use is_org_admin_or_manager()
-- which correctly checks for both 'org_admin' and 'event_manager' roles.

-- ============================================================================
-- STEP 1: Drop inconsistent policies on core tables
-- ============================================================================

-- Organizations: event_managers should be able to update org settings
DROP POLICY IF EXISTS "Org admins can update organizations" ON public.organizations;

-- Organization members: event_managers should be able to manage team
DROP POLICY IF EXISTS "Org admins can manage members" ON public.organization_members;

-- Events: event_managers should definitely be able to delete events!
DROP POLICY IF EXISTS "Org admins can delete events" ON public.events;

-- Documents: event_managers should be able to delete documents
DROP POLICY IF EXISTS "Org admins can delete documents" ON public.documents;

-- ============================================================================
-- STEP 2: Recreate policies with consistent is_org_admin_or_manager() check
-- ============================================================================

-- Organizations UPDATE - both org_admin and event_manager can update
CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (is_org_admin_or_manager(auth.uid(), id));

-- Organization members ALL - both roles can manage team members
-- Note: We keep the separate INSERT policy for new org creation
CREATE POLICY "Admins can manage members"
  ON public.organization_members FOR ALL
  USING (is_org_admin_or_manager(auth.uid(), organization_id));

-- Events DELETE - both roles can delete events
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  USING (is_org_admin_or_manager(auth.uid(), organization_id));

-- Documents DELETE - both roles can delete documents
CREATE POLICY "Admins can delete documents"
  ON public.documents FOR DELETE
  USING (is_org_admin_or_manager(auth.uid(), organization_id));

-- ============================================================================
-- STEP 3: Clean up duplicate invitations policies
-- Migration 20260115035627 and 20260115200000 both created policies
-- ============================================================================

-- Drop the duplicate/redundant policies from 20260115200000
DROP POLICY IF EXISTS "Org members can view org invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.invitations;

-- The policies from 20260115035627 are kept (they use is_org_admin_or_manager):
-- - "Org admins can manage invitations" (FOR ALL)
-- - "Users can view invitations sent to their email" (FOR SELECT)
-- - "Users can accept their invitations" (FOR UPDATE)

-- ============================================================================
-- STEP 4: Consolidate helper functions
-- Deprecate has_admin_access in favor of is_org_admin_or_manager for clarity
-- Keep has_admin_access for backwards compatibility but make it call the canonical one
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Delegate to the canonical function for consistency
  SELECT is_org_admin_or_manager(_user_id, _org_id)
$$;

COMMENT ON FUNCTION public.has_admin_access IS 'Deprecated: Use is_org_admin_or_manager instead. Kept for backwards compatibility.';
COMMENT ON FUNCTION public.is_org_admin_or_manager IS 'Canonical function to check if user has admin-level access (org_admin or event_manager role).';

-- ============================================================================
-- STEP 5: Add missing helper functions if they don't exist
-- These were created in 20260115100000 but good to ensure they exist
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_manage_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only org_admin can manage organization-level settings like billing, deletion
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'org_admin'::org_role
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_events(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Both org_admin and event_manager can manage events
  SELECT is_org_admin_or_manager(_user_id, _org_id)
$$;

COMMENT ON FUNCTION public.can_manage_org IS 'Check if user can manage organization-level settings (org_admin only).';
COMMENT ON FUNCTION public.can_manage_events IS 'Check if user can manage events (org_admin or event_manager).';
