import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Event, EventStatus, MilestoneCategory } from '@/types/database';

export function useEvents() {
  const { currentOrg } = useAuth();

  return useQuery({
    queryKey: ['events', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_type:event_types(*),
          owner:profiles!events_owner_id_fkey(*),
          milestones(*)
        `)
        .eq('organization_id', currentOrg.id)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
    enabled: !!currentOrg,
  });
}

export function useEvent(eventId: string | undefined) {
  const { currentOrg } = useAuth();

  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_type:event_types(*),
          owner:profiles!events_owner_id_fkey(*),
          milestones(
            *,
            assignee:profiles!milestones_assignee_id_fkey(*)
          )
        `)
        .eq('id', eventId)
        .maybeSingle();

      if (error) throw error;
      return data as Event | null;
    },
    enabled: !!eventId && !!currentOrg,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { currentOrg, user } = useAuth();

  return useMutation({
    mutationFn: async (eventData: {
      name: string;
      description?: string;
      event_type_id?: string;
      event_date: string;
      venue?: string;
      milestones?: Array<{
        title: string;
        description?: string;
        category: MilestoneCategory;
        due_date: string;
        is_ai_generated?: boolean;
      }>;
    }) => {
      if (!currentOrg || !user) throw new Error('Not authenticated');

      // Create event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          organization_id: currentOrg.id,
          name: eventData.name,
          description: eventData.description,
          event_type_id: eventData.event_type_id,
          event_date: eventData.event_date,
          venue: eventData.venue,
          owner_id: user.id,
          status: 'PLANNING' as EventStatus,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create milestones if provided
      if (eventData.milestones && eventData.milestones.length > 0) {
        const { error: milestonesError } = await supabase
          .from('milestones')
          .insert(
            eventData.milestones.map((m, i) => ({
              event_id: event.id,
              title: m.title,
              description: m.description || null,
              category: m.category,
              due_date: m.due_date,
              is_ai_generated: m.is_ai_generated || false,
              sort_order: i,
            }))
          );

        if (milestonesError) throw milestonesError;
      }

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', data.id] });
    },
  });
}
