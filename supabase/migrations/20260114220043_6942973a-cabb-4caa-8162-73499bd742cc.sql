-- Drop the problematic policy that causes circular dependency
DROP POLICY IF EXISTS "Org members can view membership" ON organization_members;

-- Create a simpler policy that avoids the circular call
-- Users can view memberships for organizations they belong to
CREATE POLICY "Users can view their own memberships" 
ON organization_members 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can also view memberships of orgs they're in (for seeing teammates)
CREATE POLICY "Org members can view other members"
ON organization_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.user_id = auth.uid() 
    AND om.organization_id = organization_members.organization_id
  )
);