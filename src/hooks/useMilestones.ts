import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Milestone, MilestoneStatus, MilestoneCategory } from '@/types/database';

export function useMilestones(eventId?: string) {
  return useQuery({
    queryKey: ['milestones', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      const { data, error } = await supabase
        .from('milestones')
        .select(`
          *,
          assignee:profiles!milestones_assignee_id_fkey(*),
          event:events(*)
        `)
        .eq('event_id', eventId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!eventId,
  });
}

export function useAllMilestones() {
  const { currentOrg } = useAuth();

  return useQuery({
    queryKey: ['all-milestones', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      
      const { data, error } = await supabase
        .from('milestones')
        .select(`
          *,
          assignee:profiles!milestones_assignee_id_fkey(*),
          event:events!inner(
            id,
            name,
            organization_id,
            status
          )
        `)
        .eq('event.organization_id', currentOrg.id)
        .neq('event.status', 'COMPLETED')
        .neq('event.status', 'CANCELLED')
        .neq('event.status', 'ARCHIVED')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!currentOrg,
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Milestone> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      // If marking as completed, set completedAt
      if (updates.status === 'COMPLETED') {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status) {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from('milestones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      queryClient.invalidateQueries({ queryKey: ['all-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['event', data.event_id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['attention-items'] });
    },
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestone: {
      event_id: string;
      title: string;
      description?: string;
      category: MilestoneCategory;
      due_date: string;
      assignee_id?: string;
      is_ai_generated?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('milestones')
        .insert({
          event_id: milestone.event_id,
          title: milestone.title,
          description: milestone.description || null,
          category: milestone.category,
          due_date: milestone.due_date,
          assignee_id: milestone.assignee_id || null,
          is_ai_generated: milestone.is_ai_generated || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', data.event_id] });
      queryClient.invalidateQueries({ queryKey: ['all-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['event', data.event_id] });
    },
  });
}
