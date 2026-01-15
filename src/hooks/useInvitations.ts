import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { OrgRole, Invitation, InvitationDetails } from '@/types/database';

export interface SendInvitationsParams {
  emails: string[];
  role: OrgRole;
  eventId?: string;
  message?: string;
}

export interface InvitationResult {
  email: string;
  success: boolean;
  invitationId?: string;
  error?: string;
}

export interface SendInvitationsResponse {
  success: boolean;
  message: string;
  results: InvitationResult[];
}

export function useInvitations() {
  const { currentOrg, session } = useAuth();
  const queryClient = useQueryClient();

  // Fetch pending invitations for the current organization
  const {
    data: pendingInvitations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invitations', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];

      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          inviter:profiles!invitations_invited_by_fkey(id, name, email),
          event:events(id, name)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Invitation & { inviter: { id: string; name: string | null; email: string }; event: { id: string; name: string } | null })[];
    },
    enabled: !!currentOrg,
  });

  // Send invitations via edge function
  const sendInvitationsMutation = useMutation({
    mutationFn: async ({ emails, role, eventId, message }: SendInvitationsParams): Promise<SendInvitationsResponse> => {
      if (!currentOrg || !session?.access_token) {
        throw new Error('Not authenticated or no organization selected');
      }

      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          emails,
          role,
          organizationId: currentOrg.id,
          eventId,
          message,
        },
      });

      if (error) throw error;
      return data as SendInvitationsResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', currentOrg?.id] });
    },
  });

  // Cancel/revoke an invitation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', currentOrg?.id] });
    },
  });

  // Resend an invitation (creates a new one with same details)
  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      // Get the original invitation
      const { data: original, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (fetchError || !original) throw new Error('Invitation not found');

      // Cancel the old one
      await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      // Send a new invitation
      const response = await sendInvitationsMutation.mutateAsync({
        emails: [original.email],
        role: original.role as OrgRole,
        eventId: original.event_id || undefined,
        message: original.message || undefined,
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', currentOrg?.id] });
    },
  });

  return {
    pendingInvitations,
    isLoading,
    error,
    refetch,
    sendInvitations: sendInvitationsMutation.mutateAsync,
    isSendingInvitations: sendInvitationsMutation.isPending,
    cancelInvitation: cancelInvitationMutation.mutateAsync,
    isCancellingInvitation: cancelInvitationMutation.isPending,
    resendInvitation: resendInvitationMutation.mutateAsync,
    isResendingInvitation: resendInvitationMutation.isPending,
  };
}

// Hook for invitation acceptance flow (public, no auth required initially)
export function useInvitationByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['invitation-details', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase.rpc('get_invitation_by_token', {
        invitation_token: token,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      return data[0] as InvitationDetails;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for accepting an invitation (requires auth)
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, userId }: { token: string; userId: string }) => {
      const { data, error } = await supabase.rpc('accept_invitation', {
        invitation_token: token,
        accepting_user_id: userId,
      });

      if (error) throw error;
      return data as { success: boolean; error?: string; organization_id?: string; event_id?: string; role?: string; message?: string };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    },
  });
}
