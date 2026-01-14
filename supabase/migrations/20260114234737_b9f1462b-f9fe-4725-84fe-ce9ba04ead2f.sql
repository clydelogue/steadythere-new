-- Template Versioning Migration
-- Adds support for versioned event templates with milestone snapshots

-- Add versioning columns to event_types
ALTER TABLE public.event_types
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create template_versions table
CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id UUID NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  changelog TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_type_id, version)
);

-- Add template_version_id to milestone_templates
-- Nullable for backwards compatibility with existing templates
ALTER TABLE public.milestone_templates
  ADD COLUMN IF NOT EXISTS template_version_id UUID REFERENCES public.template_versions(id) ON DELETE CASCADE;

-- Add template_version_id to events to track which template version was used
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS template_version_id UUID REFERENCES public.template_versions(id) ON DELETE SET NULL;

-- Enable RLS on template_versions
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for template_versions
CREATE POLICY "Org members can view template versions"
  ON public.template_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_types et
      WHERE et.id = event_type_id AND public.is_org_member(auth.uid(), et.organization_id)
    )
  );

CREATE POLICY "Org members can create template versions"
  ON public.template_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_types et
      WHERE et.id = event_type_id AND public.is_org_member(auth.uid(), et.organization_id)
    )
  );

-- Update milestone_templates RLS to include template_version access
-- Members can insert milestone templates for their org's templates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'milestone_templates' 
    AND policyname = 'Org members can insert milestone templates'
  ) THEN
    CREATE POLICY "Org members can insert milestone templates"
      ON public.milestone_templates FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.event_types et
          WHERE et.id = event_type_id AND public.is_org_member(auth.uid(), et.organization_id)
        )
      );
  END IF;
END $$;

-- Update event_types RLS to allow all org members to manage (for V1 simplicity)
DROP POLICY IF EXISTS "Org owners/admins can manage event types" ON public.event_types;
DROP POLICY IF EXISTS "Org members can manage event types" ON public.event_types;

CREATE POLICY "Org members can manage event types"
  ON public.event_types FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Add indexes (IF NOT EXISTS not supported for indexes, use DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_template_versions_event_type') THEN
    CREATE INDEX idx_template_versions_event_type ON public.template_versions(event_type_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_milestone_templates_version') THEN
    CREATE INDEX idx_milestone_templates_version ON public.milestone_templates(template_version_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_template_version') THEN
    CREATE INDEX idx_events_template_version ON public.events(template_version_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_event_types_active') THEN
    CREATE INDEX idx_event_types_active ON public.event_types(organization_id) WHERE is_active = true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_event_types_unique_name_per_org') THEN
    CREATE UNIQUE INDEX idx_event_types_unique_name_per_org
      ON public.event_types(organization_id, lower(name))
      WHERE is_active = true;
  END IF;
END $$;