-- Enums
CREATE TYPE public.event_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE public.milestone_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'SKIPPED');
CREATE TYPE public.milestone_category AS ENUM ('VENUE', 'CATERING', 'MARKETING', 'LOGISTICS', 'PERMITS', 'SPONSORS', 'VOLUNTEERS', 'GENERAL');
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.document_category AS ENUM ('CONTRACT', 'INVOICE', 'PERMIT', 'MARKETING', 'PHOTO', 'REPORT', 'CORRESPONDENCE', 'UNCATEGORIZED');
CREATE TYPE public.document_source AS ENUM ('UPLOAD', 'EMAIL', 'GENERATED');
CREATE TYPE public.notification_type AS ENUM ('REMINDER', 'OVERDUE', 'ESCALATION', 'ASSIGNMENT', 'DIGEST', 'WELCOME', 'EVENT_UPDATE');
CREATE TYPE public.notification_channel AS ENUM ('EMAIL', 'SMS', 'IN_APP');
CREATE TYPE public.notification_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');
CREATE TYPE public.agent_action_type AS ENUM ('MILESTONE_GENERATION', 'MILESTONE_IMPROVEMENT', 'CONTEXTUAL_HELP', 'POST_EVENT_ANALYSIS', 'TEMPLATE_UPDATE');
CREATE TYPE public.pattern_type AS ENUM ('TIMING_ADJUSTMENT', 'NEW_MILESTONE', 'REMOVE_MILESTONE', 'SEQUENCE_CHANGE', 'RESOURCE_SUGGESTION');

-- Organizations table (tenant boundary)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  default_reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1],
  digest_enabled BOOLEAN DEFAULT true,
  digest_day INTEGER DEFAULT 1, -- 1=Monday
  digest_time TIME DEFAULT '09:00',
  inbound_email_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table (user data accessible in public schema)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  timezone TEXT,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization members (junction table with roles)
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Event types (templates)
CREATE TABLE public.event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'calendar',
  default_reminder_days INTEGER[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Milestone templates
CREATE TABLE public.milestone_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id UUID NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category milestone_category NOT NULL DEFAULT 'GENERAL',
  days_before_event INTEGER NOT NULL DEFAULT 30,
  estimated_hours DECIMAL(5,2),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type_id UUID REFERENCES public.event_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_end_date DATE,
  venue TEXT,
  address TEXT,
  is_virtual BOOLEAN DEFAULT false,
  virtual_link TEXT,
  reminder_days INTEGER[],
  status event_status NOT NULL DEFAULT 'PLANNING',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Milestones
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category milestone_category NOT NULL DEFAULT 'GENERAL',
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  status milestone_status NOT NULL DEFAULT 'NOT_STARTED',
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  from_template_id UUID REFERENCES public.milestone_templates(id) ON DELETE SET NULL,
  is_ai_generated BOOLEAN DEFAULT false,
  was_modified BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT NOT NULL,
  category document_category NOT NULL DEFAULT 'UNCATEGORIZED',
  source document_source NOT NULL DEFAULT 'UPLOAD',
  source_email_from TEXT,
  source_email_subject TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  channel notification_channel NOT NULL DEFAULT 'EMAIL',
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status notification_status NOT NULL DEFAULT 'PENDING',
  related_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  related_milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent actions (AI interaction log)
CREATE TABLE public.agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type agent_action_type NOT NULL,
  prompt_summary TEXT,
  response_summary TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  was_accepted BOOLEAN,
  user_modification TEXT,
  related_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Learned patterns
CREATE TABLE public.learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pattern_type pattern_type NOT NULL,
  description TEXT NOT NULL,
  recommendation TEXT,
  source_event_ids UUID[],
  confidence DECIMAL(3,2) DEFAULT 0.5,
  is_active BOOLEAN DEFAULT true,
  applied_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_patterns ENABLE ROW LEVEL SECURITY;

-- Security definer function to check org membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Security definer function to check org role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view profiles of org members"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om1
      JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.id
    )
  );

-- Organizations RLS policies
CREATE POLICY "Org members can view their organizations"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "Org owners/admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (
    public.has_org_role(auth.uid(), id, 'owner') OR 
    public.has_org_role(auth.uid(), id, 'admin')
  );

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Organization members RLS policies
CREATE POLICY "Org members can view membership"
  ON public.organization_members FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners/admins can manage members"
  ON public.organization_members FOR ALL
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR 
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

CREATE POLICY "Users can insert themselves as owner of new org"
  ON public.organization_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Event types RLS policies
CREATE POLICY "Org members can view event types"
  ON public.event_types FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners/admins can manage event types"
  ON public.event_types FOR ALL
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR 
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- Milestone templates RLS policies
CREATE POLICY "Org members can view milestone templates"
  ON public.milestone_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_types et
      WHERE et.id = event_type_id AND public.is_org_member(auth.uid(), et.organization_id)
    )
  );

CREATE POLICY "Org owners/admins can manage milestone templates"
  ON public.milestone_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_types et
      WHERE et.id = event_type_id AND (
        public.has_org_role(auth.uid(), et.organization_id, 'owner') OR 
        public.has_org_role(auth.uid(), et.organization_id, 'admin')
      )
    )
  );

-- Events RLS policies
CREATE POLICY "Org members can view events"
  ON public.events FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create events"
  ON public.events FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update events"
  ON public.events FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners/admins can delete events"
  ON public.events FOR DELETE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR 
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- Milestones RLS policies
CREATE POLICY "Org members can view milestones"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(auth.uid(), e.organization_id)
    )
  );

CREATE POLICY "Org members can manage milestones"
  ON public.milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND public.is_org_member(auth.uid(), e.organization_id)
    )
  );

-- Documents RLS policies
CREATE POLICY "Org members can view documents"
  ON public.documents FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can upload documents"
  ON public.documents FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners/admins can delete documents"
  ON public.documents FOR DELETE
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR 
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- Notifications RLS policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Agent actions RLS policies
CREATE POLICY "Users can view their own agent actions"
  ON public.agent_actions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create agent actions"
  ON public.agent_actions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Learned patterns RLS policies
CREATE POLICY "Org members can view learned patterns"
  ON public.learned_patterns FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners/admins can manage learned patterns"
  ON public.learned_patterns FOR ALL
  USING (
    public.has_org_role(auth.uid(), organization_id, 'owner') OR 
    public.has_org_role(auth.uid(), organization_id, 'admin')
  );

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_event_types_updated_at
  BEFORE UPDATE ON public.event_types
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_learned_patterns_updated_at
  BEFORE UPDATE ON public.learned_patterns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_events_org ON public.events(organization_id);
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_milestones_event ON public.milestones(event_id);
CREATE INDEX idx_milestones_due_date ON public.milestones(due_date);
CREATE INDEX idx_milestones_status ON public.milestones(status);
CREATE INDEX idx_milestones_assignee ON public.milestones(assignee_id);
CREATE INDEX idx_documents_org ON public.documents(organization_id);
CREATE INDEX idx_documents_event ON public.documents(event_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_scheduled ON public.notifications(scheduled_for) WHERE status = 'PENDING';