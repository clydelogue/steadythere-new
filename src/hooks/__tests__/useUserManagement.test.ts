import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUserManagement } from '../useUserManagement';
import { useInvitations, useInvitationByToken, useAcceptInvitation } from '../useInvitations';
import {
  createWrapper,
  createMockOrganization,
  createMockProfile,
  createMockOrganizationMember,
  createMockInvitation,
  createSupabaseChainMock,
} from './setup';

// Mock dependencies
const mockSupabaseFrom = vi.fn();
const mockSupabaseFunctionsInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    functions: {
      invoke: (...args: unknown[]) => mockSupabaseFunctionsInvoke(...args),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';

describe('useUserManagement', () => {
  const mockOrg = createMockOrganization({ id: 'org-123' });
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  let supabaseChain: ReturnType<typeof createSupabaseChainMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseChain = createSupabaseChainMock();
    mockSupabaseFrom.mockReturnValue(supabaseChain);

    vi.mocked(useAuth).mockReturnValue({
      currentOrg: mockOrg,
      user: mockUser,
      session: { access_token: 'test-token' },
      profile: createMockProfile(),
      currentOrgMember: null,
      currentRole: 'org_admin',
      organizations: [],
      isLoading: false,
      orgsLoaded: true,
      hasPermission: () => true,
      hasAnyPermission: () => true,
      canManageTeam: true,
      canManageOrg: true,
      canManageEvents: true,
      isAdmin: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      switchOrganization: vi.fn(),
      refreshProfile: vi.fn(),
      refreshOrganizations: vi.fn(),
    } as ReturnType<typeof useAuth>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useUserManagement (org members)', () => {
    it('fetches members for current organization', async () => {
      const mockMembers = [
        createMockOrganizationMember({ id: 'member-1', user_id: 'user-1', role: 'org_admin' }),
        createMockOrganizationMember({ id: 'member-2', user_id: 'user-2', role: 'event_manager' }),
      ];
      supabaseChain.resolvesWith(mockMembers);

      const { result } = renderHook(() => useUserManagement(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toEqual(mockMembers);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('organization_members');
      expect(supabaseChain.eq).toHaveBeenCalledWith('organization_id', 'org-123');
    });

    it('includes profile data for each member', async () => {
      const mockMembers = [
        createMockOrganizationMember({
          id: 'member-1',
          profile: createMockProfile({ id: 'user-1', name: 'User One', email: 'one@example.com' }),
        }),
      ];
      supabaseChain.resolvesWith(mockMembers);

      const { result } = renderHook(() => useUserManagement(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify select includes profiles join
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('profile:profiles!organization_members_user_id_fkey(*)');
    });

    it('includes role information', async () => {
      const mockMembers = [
        createMockOrganizationMember({ id: 'member-1', role: 'org_admin' }),
        createMockOrganizationMember({ id: 'member-2', role: 'event_manager' }),
        createMockOrganizationMember({ id: 'member-3', role: 'volunteer' }),
      ];
      supabaseChain.resolvesWith(mockMembers);

      const { result } = renderHook(() => useUserManagement(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members[0].role).toBe('org_admin');
      expect(result.current.members[1].role).toBe('event_manager');
      expect(result.current.members[2].role).toBe('volunteer');
    });

    it('returns empty array when no members', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useUserManagement(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toEqual([]);
    });

    it('orders members by created_at ascending', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useUserManagement(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseChain.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('provides members grouped by role', async () => {
      const mockMembers = [
        createMockOrganizationMember({ id: 'member-1', role: 'org_admin' }),
        createMockOrganizationMember({ id: 'member-2', role: 'event_manager' }),
        createMockOrganizationMember({ id: 'member-3', role: 'org_admin' }),
      ];
      supabaseChain.resolvesWith(mockMembers);

      const { result } = renderHook(() => useUserManagement(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.membersByRole.org_admin).toHaveLength(2);
      expect(result.current.membersByRole.event_manager).toHaveLength(1);
    });

    it('does not fetch when no currentOrg', async () => {
      vi.mocked(useAuth).mockReturnValue({
        currentOrg: null,
        user: mockUser,
        session: null,
        profile: null,
        currentOrgMember: null,
        currentRole: null,
        organizations: [],
        isLoading: false,
        orgsLoaded: true,
        hasPermission: () => false,
        hasAnyPermission: () => false,
        canManageTeam: false,
        canManageOrg: false,
        canManageEvents: false,
        isAdmin: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        switchOrganization: vi.fn(),
        refreshProfile: vi.fn(),
        refreshOrganizations: vi.fn(),
      } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useUserManagement(), {
        wrapper: createWrapper(),
      });

      expect(result.current.members).toEqual([]);
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('provides updateRole mutation', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useUserManagement(), {
        wrapper: createWrapper(),
      });

      expect(result.current.updateRole).toBeDefined();
      expect(typeof result.current.updateRole).toBe('function');
    });

    it('provides removeMember mutation', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useUserManagement(), {
        wrapper: createWrapper(),
      });

      expect(result.current.removeMember).toBeDefined();
      expect(typeof result.current.removeMember).toBe('function');
    });

    it('provides inviteMember mutation', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useUserManagement(), {
        wrapper: createWrapper(),
      });

      expect(result.current.inviteMember).toBeDefined();
      expect(typeof result.current.inviteMember).toBe('function');
    });
  });
});

describe('useInvitations', () => {
  const mockOrg = createMockOrganization({ id: 'org-123' });
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  let supabaseChain: ReturnType<typeof createSupabaseChainMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseChain = createSupabaseChainMock();
    mockSupabaseFrom.mockReturnValue(supabaseChain);

    vi.mocked(useAuth).mockReturnValue({
      currentOrg: mockOrg,
      user: mockUser,
      session: { access_token: 'test-token' },
      profile: createMockProfile(),
      currentOrgMember: null,
      currentRole: 'org_admin',
      organizations: [],
      isLoading: false,
      orgsLoaded: true,
      hasPermission: () => true,
      hasAnyPermission: () => true,
      canManageTeam: true,
      canManageOrg: true,
      canManageEvents: true,
      isAdmin: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      switchOrganization: vi.fn(),
      refreshProfile: vi.fn(),
      refreshOrganizations: vi.fn(),
    } as ReturnType<typeof useAuth>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useInvitations', () => {
    it('fetches pending invitations only', async () => {
      const mockInvitations = [
        createMockInvitation({ id: 'inv-1', status: 'pending' }),
        createMockInvitation({ id: 'inv-2', status: 'pending' }),
      ];
      supabaseChain.resolvesWith(mockInvitations);

      const { result } = renderHook(() => useInvitations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('invitations');
      expect(supabaseChain.eq).toHaveBeenCalledWith('organization_id', 'org-123');
      expect(supabaseChain.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('includes inviter profile data', async () => {
      const mockInvitations = [
        createMockInvitation({
          id: 'inv-1',
          inviter: createMockProfile({ id: 'user-123', name: 'Inviter Name' }),
        }),
      ];
      supabaseChain.resolvesWith(mockInvitations);

      const { result } = renderHook(() => useInvitations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify select includes inviter join
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('inviter:profiles!invitations_invited_by_fkey');
    });

    it('includes event data when invitation is event-specific', async () => {
      const mockInvitations = [
        createMockInvitation({
          id: 'inv-1',
          event_id: 'event-123',
          event: { id: 'event-123', name: 'Test Event' },
        }),
      ];
      supabaseChain.resolvesWith(mockInvitations);

      const { result } = renderHook(() => useInvitations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify select includes event join
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('event:events!invitations_event_id_fkey');
    });

    it('orders by created_at descending (most recent first)', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useInvitations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabaseChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('returns empty array when no pending invitations', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useInvitations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pendingInvitations).toEqual([]);
    });

    it('does not fetch when no currentOrg', async () => {
      vi.mocked(useAuth).mockReturnValue({
        currentOrg: null,
        user: mockUser,
        session: null,
        profile: null,
        currentOrgMember: null,
        currentRole: null,
        organizations: [],
        isLoading: false,
        orgsLoaded: true,
        hasPermission: () => false,
        hasAnyPermission: () => false,
        canManageTeam: false,
        canManageOrg: false,
        canManageEvents: false,
        isAdmin: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        switchOrganization: vi.fn(),
        refreshProfile: vi.fn(),
        refreshOrganizations: vi.fn(),
      } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useInvitations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.pendingInvitations).toEqual([]);
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('provides sendInvitations mutation', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useInvitations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.sendInvitations).toBeDefined();
      expect(typeof result.current.sendInvitations).toBe('function');
    });

    it('provides cancelInvitation mutation', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useInvitations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.cancelInvitation).toBeDefined();
      expect(typeof result.current.cancelInvitation).toBe('function');
    });

    it('provides resendInvitation mutation', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useInvitations(), {
        wrapper: createWrapper(),
      });

      expect(result.current.resendInvitation).toBeDefined();
      expect(typeof result.current.resendInvitation).toBe('function');
    });
  });

  describe('useInvitationByToken', () => {
    it('fetches invitation by token', async () => {
      const mockInvitation = {
        id: 'inv-123',
        organization_id: 'org-123',
        event_id: null,
        email: 'invitee@example.com',
        role: 'event_manager',
        message: null,
        expires_at: '2026-02-01T00:00:00Z',
        status: 'pending',
        organization: { name: 'Test Org' },
        event: null,
        inviter: { name: 'Inviter', email: 'inviter@example.com' },
      };
      supabaseChain.resolvesWith(mockInvitation);

      const { result } = renderHook(() => useInvitationByToken('test-token-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('invitations');
      expect(supabaseChain.eq).toHaveBeenCalledWith('token', 'test-token-123');
      expect(supabaseChain.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('includes organization data for display', async () => {
      const mockInvitation = {
        id: 'inv-123',
        organization_id: 'org-123',
        event_id: null,
        email: 'invitee@example.com',
        role: 'event_manager',
        message: null,
        expires_at: '2026-02-01T00:00:00Z',
        status: 'pending',
        organization: { name: 'Test Organization' },
        event: null,
        inviter: { name: 'Inviter', email: 'inviter@example.com' },
      };
      supabaseChain.resolvesWith(mockInvitation);

      const { result } = renderHook(() => useInvitationByToken('test-token-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify select includes organization join
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('organization:organizations!invitations_organization_id_fkey');
    });

    it('returns null for invalid token', async () => {
      supabaseChain.resolvesWithError('Not found', 'PGRST116');

      const { result } = renderHook(() => useInvitationByToken('invalid-token'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('returns null when token is undefined', async () => {
      const { result } = renderHook(() => useInvitationByToken(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('does not require authentication (public query)', async () => {
      // Even without auth context, the token query should work
      vi.mocked(useAuth).mockReturnValue({
        currentOrg: null,
        user: null,
        session: null,
        profile: null,
        currentOrgMember: null,
        currentRole: null,
        organizations: [],
        isLoading: false,
        orgsLoaded: true,
        hasPermission: () => false,
        hasAnyPermission: () => false,
        canManageTeam: false,
        canManageOrg: false,
        canManageEvents: false,
        isAdmin: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        switchOrganization: vi.fn(),
        refreshProfile: vi.fn(),
        refreshOrganizations: vi.fn(),
      } as ReturnType<typeof useAuth>);

      const mockInvitation = {
        id: 'inv-123',
        organization_id: 'org-123',
        event_id: null,
        email: 'invitee@example.com',
        role: 'event_manager',
        message: null,
        expires_at: '2026-02-01T00:00:00Z',
        status: 'pending',
        organization: { name: 'Test Org' },
        event: null,
        inviter: { name: 'Inviter', email: 'inviter@example.com' },
      };
      supabaseChain.resolvesWith(mockInvitation);

      const { result } = renderHook(() => useInvitationByToken('test-token-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should still fetch even without auth
      expect(mockSupabaseFrom).toHaveBeenCalledWith('invitations');
    });
  });

  describe('useAcceptInvitation', () => {
    it('provides accept mutation', async () => {
      const { result } = renderHook(() => useAcceptInvitation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mutateAsync).toBeDefined();
      expect(result.current.isPending).toBe(false);
    });
  });
});

describe('role helpers', () => {
  it('identifies admin roles', () => {
    const isAdminRole = (role: string) => role === 'org_admin';

    expect(isAdminRole('org_admin')).toBe(true);
    expect(isAdminRole('event_manager')).toBe(false);
    expect(isAdminRole('vendor')).toBe(false);
    expect(isAdminRole('partner')).toBe(false);
    expect(isAdminRole('volunteer')).toBe(false);
  });

  it('sorts members by role hierarchy', () => {
    const members = [
      { role: 'volunteer' },
      { role: 'org_admin' },
      { role: 'event_manager' },
      { role: 'vendor' },
      { role: 'partner' },
    ];

    const roleOrder = ['org_admin', 'event_manager', 'vendor', 'partner', 'volunteer'];
    const sorted = [...members].sort((a, b) =>
      roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
    );

    expect(sorted[0].role).toBe('org_admin');
    expect(sorted[1].role).toBe('event_manager');
    expect(sorted[2].role).toBe('vendor');
    expect(sorted[3].role).toBe('partner');
    expect(sorted[4].role).toBe('volunteer');
  });

  it('handles unknown roles in sort', () => {
    const members = [
      { role: 'volunteer' },
      { role: 'unknown_role' },
      { role: 'org_admin' },
    ];

    const roleOrder = ['org_admin', 'event_manager', 'vendor', 'partner', 'volunteer'];
    const sorted = [...members].sort((a, b) => {
      const aIndex = roleOrder.indexOf(a.role);
      const bIndex = roleOrder.indexOf(b.role);
      // Unknown roles go to end
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    expect(sorted[0].role).toBe('org_admin');
    expect(sorted[1].role).toBe('volunteer');
    expect(sorted[2].role).toBe('unknown_role');
  });
});
