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
          event:events!invitations_event_id_fkey(id, name)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as (Invitation & { inviter: { id: string; name: string | null; email: string }; event: { id: string; name: string } | null })[];
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
    queryFn: async (): Promise<InvitationDetails | null> => {
      if (!token) return null;

      // Query the invitation directly with token
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id,
          organization_id,
          event_id,
          email,
          role,
          message,
          expires_at,
          status,
          organization:organizations!invitations_organization_id_fkey(name),
          event:events!invitations_event_id_fkey(name),
          inviter:profiles!invitations_invited_by_fkey(name, email)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) return null;

      // Transform to InvitationDetails
      const org = data.organization as unknown as { name: string } | null;
      const event = data.event as unknown as { name: string } | null;
      const inviter = data.inviter as unknown as { name: string | null; email: string } | null;

      return {
        id: data.id,
        organization_id: data.organization_id,
        organization_name: org?.name || 'Unknown Organization',
        event_id: data.event_id,
        event_name: event?.name || null,
        email: data.email,
        role: data.role,
        inviter_name: inviter?.name || null,
        inviter_email: inviter?.email || '',
        message: data.message,
        expires_at: data.expires_at,
      };
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for accepting an invitation (requires auth)
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, userId }: { token: string; userId: string }): Promise<{ success: boolean; error?: string; organization_id?: string; event_id?: string; role?: string }> => {
      // Get the invitation
      const { data: invitation, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (fetchError || !invitation) {
        return { success: false, error: 'Invitation not found or already used' };
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
        return { success: false, error: 'Invitation has expired' };
      }

      // Add user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: userId,
          role: invitation.role,
        });

      if (memberError) {
        if (memberError.code === '23505') {
          return { success: false, error: 'You are already a member of this organization' };
        }
        return { success: false, error: memberError.message };
      }

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq('id', invitation.id);

      return { 
        success: true, 
        organization_id: invitation.organization_id,
        event_id: invitation.event_id || undefined,
        role: invitation.role,
      };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
    },
  });
}
