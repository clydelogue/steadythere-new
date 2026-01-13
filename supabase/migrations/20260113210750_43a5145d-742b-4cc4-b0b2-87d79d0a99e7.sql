-- The issue is that when creating an organization, the INSERT succeeds but the 
-- subsequent SELECT (from .select()) fails because the user isn't a member yet.
-- We need to allow users to SELECT orgs they just inserted in the same request.

-- Option 1: Create a more permissive SELECT policy for newly created orgs
-- This is tricky because we need to allow the INSERT...RETURNING to work

-- Better approach: Allow authenticated users to SELECT orgs during creation
-- by checking if the org was just created (within a short time window)
-- OR use a different approach

-- Actually, the cleanest fix is to ensure the organization_members insert 
-- happens first, but that requires the org_id which we don't have yet.

-- The proper fix: Allow SELECT for orgs where user is being added as owner in same transaction
-- Since that's complex, let's use a simpler approach:
-- Allow users to see organizations by checking if no one else is a member yet (new org)

DROP POLICY IF EXISTS "Org members can view their organizations" ON public.organizations;

CREATE POLICY "Org members can view their organizations" 
ON public.organizations 
FOR SELECT 
USING (
  is_org_member(auth.uid(), id) OR 
  -- Allow viewing orgs that have no members yet (just created)
  NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = id)
);