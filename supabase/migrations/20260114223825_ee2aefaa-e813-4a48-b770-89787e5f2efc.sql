-- Drop the problematic recursive policy on organization_members
DROP POLICY IF EXISTS "Org members can view other members" ON public.organization_members;

-- Drop the problematic policy on profiles that causes recursion via organization_members
DROP POLICY IF EXISTS "Users can view profiles of org members" ON public.profiles;

-- Re-add profiles policy - allow users to view their own profile OR profiles of people in their orgs
-- Uses the SECURITY DEFINER is_org_member function which bypasses RLS
CREATE POLICY "Users can view profiles of org members" 
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM public.organization_members om1
    WHERE om1.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organization_members om2
      WHERE om2.user_id = profiles.id
      AND om2.organization_id = om1.organization_id
    )
  )
);