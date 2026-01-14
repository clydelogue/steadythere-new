-- Drop the flawed policy
DROP POLICY IF EXISTS "Org members can view their organizations" ON public.organizations;

-- Create a secure policy that only allows org members to view their organizations
CREATE POLICY "Org members can view their organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), id));