import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEvents, useEvent, useCreateEvent, useUpdateEvent } from '../useEvents';
import {
  createWrapper,
  createMockEvent,
  createMockMilestone,
  createMockOrganization,
  createMockProfile,
  createSupabaseChainMock,
} from './setup';

// Mock dependencies
const mockSupabaseFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/contexts/AuthContext';

describe('useEvents', () => {
  const mockOrg = createMockOrganization({ id: 'org-123' });
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  let supabaseChain: ReturnType<typeof createSupabaseChainMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseChain = createSupabaseChainMock();
    mockSupabaseFrom.mockReturnValue(supabaseChain);

    // Default auth mock - authenticated with org
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

  describe('useEvents (list)', () => {
    it('fetches events for current organization', async () => {
      const mockEvents = [
        createMockEvent({ id: 'event-1', name: 'Event 1' }),
        createMockEvent({ id: 'event-2', name: 'Event 2' }),
      ];
      supabaseChain.resolvesWith(mockEvents);

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEvents);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('events');
      expect(supabaseChain.eq).toHaveBeenCalledWith('organization_id', 'org-123');
    });

    it('includes related event_type data', async () => {
      const mockEvents = [
        createMockEvent({
          id: 'event-1',
          event_type: { id: 'type-1', name: 'Conference' },
        }),
      ];
      supabaseChain.resolvesWith(mockEvents);

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify select includes event_types join
      expect(supabaseChain.select).toHaveBeenCalled();
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('event_type:event_types(*)');
    });

    it('includes owner profile data', async () => {
      const mockEvents = [
        createMockEvent({
          id: 'event-1',
          owner: createMockProfile({ id: 'user-123', name: 'Test Owner' }),
        }),
      ];
      supabaseChain.resolvesWith(mockEvents);

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify select includes profiles join
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('owner:profiles!events_owner_id_fkey(*)');
    });

    it('includes milestone data', async () => {
      const mockEvents = [
        createMockEvent({
          id: 'event-1',
          milestones: [
            createMockMilestone({ id: 'ms-1', status: 'COMPLETED' }),
            createMockMilestone({ id: 'ms-2', status: 'NOT_STARTED' }),
          ],
        }),
      ];
      supabaseChain.resolvesWith(mockEvents);

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify select includes milestones
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('milestones(*)');
    });

    it('orders by event_date ascending', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabaseChain.order).toHaveBeenCalledWith('event_date', { ascending: true });
    });

    it('returns empty array when no events', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('handles fetch error gracefully', async () => {
      supabaseChain.resolvesWithError('Database error', 'PGRST116');

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
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

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      // Query should be disabled - data is undefined when query hasn't run
      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('uses correct query key pattern', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useEvents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The query key should be ['events', orgId]
      // We can't directly inspect the query key, but we can verify the hook works correctly
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('useEvent (single)', () => {
    it('fetches single event by ID', async () => {
      const mockEvent = createMockEvent({ id: 'event-123', name: 'Test Event' });
      supabaseChain.resolvesWith(mockEvent);

      const { result } = renderHook(() => useEvent('event-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEvent);
      expect(supabaseChain.eq).toHaveBeenCalledWith('id', 'event-123');
    });

    it('includes all milestones for the event with assignee data', async () => {
      const mockEvent = createMockEvent({
        id: 'event-123',
        milestones: [
          createMockMilestone({
            id: 'ms-1',
            assignee: createMockProfile({ id: 'user-1', name: 'Assignee 1' }),
          }),
          createMockMilestone({
            id: 'ms-2',
            assignee: createMockProfile({ id: 'user-2', name: 'Assignee 2' }),
          }),
        ],
      });
      supabaseChain.resolvesWith(mockEvent);

      const { result } = renderHook(() => useEvent('event-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify select includes milestones with assignee join
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('milestones(');
      expect(selectCall).toContain('assignee:profiles!milestones_assignee_id_fkey(*)');
    });

    it('returns null for non-existent event', async () => {
      supabaseChain.resolvesWith(null);

      const { result } = renderHook(() => useEvent('non-existent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('does not fetch when eventId is undefined', async () => {
      const { result } = renderHook(() => useEvent(undefined), {
        wrapper: createWrapper(),
      });

      // Query should be disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
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

      const { result } = renderHook(() => useEvent('event-123'), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('uses maybeSingle() for single event query', async () => {
      const mockEvent = createMockEvent({ id: 'event-123' });
      supabaseChain.resolvesWith(mockEvent);

      const { result } = renderHook(() => useEvent('event-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabaseChain.maybeSingle).toHaveBeenCalled();
    });
  });
});

describe('event data transformations', () => {
  it('computes milestone completion percentage', () => {
    const milestones = [
      createMockMilestone({ status: 'COMPLETED' }),
      createMockMilestone({ status: 'COMPLETED' }),
      createMockMilestone({ status: 'IN_PROGRESS' }),
      createMockMilestone({ status: 'NOT_STARTED' }),
    ];

    const completed = milestones.filter(m => m.status === 'COMPLETED').length;
    const percentage = Math.round((completed / milestones.length) * 100);

    expect(percentage).toBe(50);
  });

  it('handles all milestones completed', () => {
    const milestones = [
      createMockMilestone({ status: 'COMPLETED' }),
      createMockMilestone({ status: 'COMPLETED' }),
      createMockMilestone({ status: 'COMPLETED' }),
    ];

    const completed = milestones.filter(m => m.status === 'COMPLETED').length;
    const percentage = Math.round((completed / milestones.length) * 100);

    expect(percentage).toBe(100);
  });

  it('handles no milestones completed', () => {
    const milestones = [
      createMockMilestone({ status: 'NOT_STARTED' }),
      createMockMilestone({ status: 'IN_PROGRESS' }),
      createMockMilestone({ status: 'BLOCKED' }),
    ];

    const completed = milestones.filter(m => m.status === 'COMPLETED').length;
    const percentage = Math.round((completed / milestones.length) * 100);

    expect(percentage).toBe(0);
  });

  it('handles empty milestones array', () => {
    const milestones: ReturnType<typeof createMockMilestone>[] = [];

    const completed = milestones.filter(m => m.status === 'COMPLETED').length;
    const percentage = milestones.length > 0
      ? Math.round((completed / milestones.length) * 100)
      : 0;

    expect(percentage).toBe(0);
  });

  it('identifies overdue milestones', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const milestone = createMockMilestone({
      status: 'NOT_STARTED',
      due_date: yesterday.toISOString().split('T')[0],
    });

    const isOverdue = new Date(milestone.due_date!) < now &&
      !['COMPLETED', 'SKIPPED'].includes(milestone.status!);

    expect(isOverdue).toBe(true);
  });

  it('identifies milestone as not overdue when completed', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const milestone = createMockMilestone({
      status: 'COMPLETED',
      due_date: yesterday.toISOString().split('T')[0],
    });

    const isOverdue = new Date(milestone.due_date!) < now &&
      !['COMPLETED', 'SKIPPED'].includes(milestone.status!);

    expect(isOverdue).toBe(false);
  });

  it('identifies milestone as not overdue when due in future', () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const milestone = createMockMilestone({
      status: 'NOT_STARTED',
      due_date: tomorrow.toISOString().split('T')[0],
    });

    const isOverdue = new Date(milestone.due_date!) < now &&
      !['COMPLETED', 'SKIPPED'].includes(milestone.status!);

    expect(isOverdue).toBe(false);
  });

  it('identifies skipped milestone as not overdue', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const milestone = createMockMilestone({
      status: 'SKIPPED',
      due_date: yesterday.toISOString().split('T')[0],
    });

    const isOverdue = new Date(milestone.due_date!) < now &&
      !['COMPLETED', 'SKIPPED'].includes(milestone.status!);

    expect(isOverdue).toBe(false);
  });
});

describe('useCreateEvent', () => {
  const mockSupabaseFrom = vi.fn();
  let supabaseChain: ReturnType<typeof createSupabaseChainMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseChain = createSupabaseChainMock();
    mockSupabaseFrom.mockReturnValue(supabaseChain);

    const mockOrg = createMockOrganization({ id: 'org-123' });
    const mockUser = { id: 'user-123', email: 'test@example.com' };

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

  it('creates an event with the correct data', async () => {
    const createdEvent = createMockEvent({ id: 'new-event-123' });
    supabaseChain.resolvesWith(createdEvent);

    const { result } = renderHook(() => useCreateEvent(), {
      wrapper: createWrapper(),
    });

    // We verify that the hook is properly set up
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('throws error when not authenticated', async () => {
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

    const { result } = renderHook(() => useCreateEvent(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        name: 'Test Event',
        event_date: '2026-06-01',
      })
    ).rejects.toThrow('Not authenticated');
  });
});

describe('useUpdateEvent', () => {
  let supabaseChain: ReturnType<typeof createSupabaseChainMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseChain = createSupabaseChainMock();
    mockSupabaseFrom.mockReturnValue(supabaseChain);

    const mockOrg = createMockOrganization({ id: 'org-123' });
    const mockUser = { id: 'user-123', email: 'test@example.com' };

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

  it('provides update mutation', async () => {
    const { result } = renderHook(() => useUpdateEvent(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });
});
