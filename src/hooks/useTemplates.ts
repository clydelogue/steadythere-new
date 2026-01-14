import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MilestoneCategory } from '@/types/database';
import type { Tables } from '@/integrations/supabase/types';

type EventType = Tables<'event_types'>;
type MilestoneTemplate = Tables<'milestone_templates'>;

// Extended type for templates with computed fields
export interface TemplateWithDetails extends EventType {
  milestone_count: number;
  last_used_at: string | null;
  events_count: number;
  milestone_templates?: MilestoneTemplate[];
}

/**
 * Fetch all templates for the current organization
 */
export function useTemplates() {
  const { currentOrg } = useAuth();

  return useQuery({
    queryKey: ['templates', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];

      // Get templates with milestone count and last used date
      const { data: templates, error } = await supabase
        .from('event_types')
        .select(`
          *,
          milestone_templates(count),
          events(id, created_at)
        `)
        .eq('organization_id', currentOrg.id)
        .order('name', { ascending: true });

      if (error) throw error;

      // Transform to include computed fields
      return (templates || []).map((t: any) => ({
        ...t,
        milestone_count: t.milestone_templates?.[0]?.count || 0,
        events_count: t.events?.length || 0,
        last_used_at: t.events?.length > 0
          ? t.events.sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0].created_at
          : null,
        milestone_templates: undefined,
        events: undefined,
      })) as TemplateWithDetails[];
    },
    enabled: !!currentOrg,
  });
}

/**
 * Fetch a single template with its milestones
 */
export function useTemplate(templateId: string | undefined) {
  const { currentOrg } = useAuth();

  return useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('event_types')
        .select(`
          *,
          milestone_templates(*)
        `)
        .eq('id', templateId)
        .single();

      if (error) throw error;

      // Sort milestones by sort_order
      if (data.milestone_templates) {
        data.milestone_templates.sort((a: MilestoneTemplate, b: MilestoneTemplate) =>
          (a.sort_order || 0) - (b.sort_order || 0)
        );
      }

      return data as TemplateWithDetails;
    },
    enabled: !!templateId && !!currentOrg,
  });
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  icon?: string;
  milestones: Array<{
    title: string;
    description?: string;
    category: MilestoneCategory;
    days_before_event: number;
    estimated_hours?: number;
  }>;
}

/**
 * Create a new template with initial milestones
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { currentOrg } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!currentOrg) throw new Error('Not authenticated');

      // Create the event type (template)
      const { data: eventType, error: typeError } = await supabase
        .from('event_types')
        .insert({
          organization_id: currentOrg.id,
          name: input.name,
          description: input.description || null,
          icon: input.icon || 'calendar',
        })
        .select()
        .single();

      if (typeError) throw typeError;

      // Create milestone templates
      if (input.milestones.length > 0) {
        const { error: milestonesError } = await supabase
          .from('milestone_templates')
          .insert(
            input.milestones.map((m, i) => ({
              event_type_id: eventType.id,
              title: m.title,
              description: m.description || null,
              category: m.category,
              days_before_event: m.days_before_event,
              estimated_hours: m.estimated_hours || null,
              sort_order: i,
            }))
          );

        if (milestonesError) throw milestonesError;
      }

      return eventType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export interface UpdateTemplateInput {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
}

/**
 * Update template metadata (not milestones)
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTemplateInput) => {
      const { data, error } = await supabase
        .from('event_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', data.id] });
    },
  });
}

/**
 * Delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('event_types')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
