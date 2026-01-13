import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EventType } from '@/types/database';

export function useEventTypes() {
  const { currentOrg } = useAuth();

  return useQuery({
    queryKey: ['event-types', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      
      const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as EventType[];
    },
    enabled: !!currentOrg,
  });
}
