import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { OrgRole, Profile } from '@/types/database';

export interface OrgMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: OrgRole;
  created_at: string;
  profile: Profile;
}

export interface InviteMemberParams {
  email: string;
  role: OrgRole;
}

export interface UpdateMemberRoleParams {
  memberId: string;
  newRole: OrgRole;
}

export function useUserManagement() {
  const { currentOrg } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all members of the current organization
  const {
    data: members = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['org-members', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          profile:profiles!organization_members_user_id_fkey(*)
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as OrgMember[];
    },
    enabled: !!currentOrg,
  });

  // Get members grouped by role
  const membersByRole = members.reduce((acc, member) => {
    if (!acc[member.role]) {
      acc[member.role] = [];
    }
    acc[member.role].push(member);
    return acc;
  }, {} as Record<OrgRole, OrgMember[]>);

  // Update a member's role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: UpdateMemberRoleParams) => {
      const { data, error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['team-members', currentOrg?.id] });
    },
  });

  // Remove a member from the organization
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['team-members', currentOrg?.id] });
    },
  });

  // Invite a new member (placeholder - needs email/invite system)
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role }: InviteMemberParams) => {
      // For now, we'll check if the user exists and add them directly
      // In production, this should send an invite email
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!existingProfile) {
        throw new Error('User not found. They need to sign up first.');
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', currentOrg?.id)
        .eq('user_id', existingProfile.id)
        .maybeSingle();

      if (existingMember) {
        throw new Error('User is already a member of this organization.');
      }

      // Add the member
      const { data, error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: currentOrg?.id,
          user_id: existingProfile.id,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['team-members', currentOrg?.id] });
    },
  });

  return {
    members,
    membersByRole,
    isLoading,
    error,
    refetch,
    updateRole: updateRoleMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,
    removeMember: removeMemberMutation.mutateAsync,
    isRemovingMember: removeMemberMutation.isPending,
    inviteMember: inviteMemberMutation.mutateAsync,
    isInvitingMember: inviteMemberMutation.isPending,
  };
}
