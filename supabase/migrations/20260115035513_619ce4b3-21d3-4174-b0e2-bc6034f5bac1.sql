-- Step 1: Create new type first
CREATE TYPE public.org_role_new AS ENUM ('org_admin', 'event_manager', 'vendor', 'partner', 'volunteer');

-- Step 2: Add temp column with new type
ALTER TABLE public.organization_members ADD COLUMN role_new org_role_new;

-- Step 3: Migrate data
UPDATE public.organization_members 
SET role_new = CASE 
    WHEN role::text = 'owner' THEN 'org_admin'::org_role_new
    WHEN role::text = 'admin' THEN 'event_manager'::org_role_new
    ELSE 'volunteer'::org_role_new
END;

-- Step 4: Make NOT NULL and drop old column
ALTER TABLE public.organization_members ALTER COLUMN role_new SET NOT NULL;
ALTER TABLE public.organization_members DROP COLUMN role;
ALTER TABLE public.organization_members RENAME COLUMN role_new TO role;
ALTER TABLE public.organization_members ALTER COLUMN role SET DEFAULT 'volunteer'::org_role_new;

-- Step 5: Use CASCADE to drop old type and ALL its dependents (functions, policies)
DROP TYPE public.org_role CASCADE;

-- Step 6: Rename new type to org_role
ALTER TYPE public.org_role_new RENAME TO org_role;

-- Step 7: Recreate the has_org_role function
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role org_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
  )
$$;

-- Step 8: Create helper function for admin-level roles
CREATE OR REPLACE FUNCTION public.is_org_admin_or_manager(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('org_admin'::org_role, 'event_manager'::org_role)
  )
$$;

-- Step 9: Recreate ALL dropped RLS policies with new role references
CREATE POLICY "Org admins can delete documents" 
ON public.documents 
FOR DELETE 
USING (has_org_role(auth.uid(), organization_id, 'org_admin'::org_role));

CREATE POLICY "Org admins can delete events" 
ON public.events 
FOR DELETE 
USING (has_org_role(auth.uid(), organization_id, 'org_admin'::org_role));

CREATE POLICY "Org admins can manage learned patterns" 
ON public.learned_patterns 
FOR ALL 
USING (is_org_admin_or_manager(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage milestone templates" 
ON public.milestone_templates 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM event_types et
  WHERE et.id = milestone_templates.event_type_id 
  AND is_org_admin_or_manager(auth.uid(), et.organization_id)
));

CREATE POLICY "Org admins can manage members" 
ON public.organization_members 
FOR ALL 
USING (has_org_role(auth.uid(), organization_id, 'org_admin'::org_role));

CREATE POLICY "Org admins can update organizations" 
ON public.organizations 
FOR UPDATE 
USING (has_org_role(auth.uid(), id, 'org_admin'::org_role));