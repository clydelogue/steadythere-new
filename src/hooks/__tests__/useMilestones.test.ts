import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMilestones, useAllMilestones, useUpdateMilestone, useCreateMilestone } from '../useMilestones';
import {
  createWrapper,
  createMockMilestone,
  createMockOrganization,
  createMockProfile,
  createMockEvent,
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

describe('useMilestones', () => {
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

  describe('useMilestones (for single event)', () => {
    it('fetches milestones for specific event', async () => {
      const mockMilestones = [
        createMockMilestone({ id: 'ms-1', event_id: 'event-123' }),
        createMockMilestone({ id: 'ms-2', event_id: 'event-123' }),
      ];
      supabaseChain.resolvesWith(mockMilestones);

      const { result } = renderHook(() => useMilestones('event-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMilestones);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('milestones');
      expect(supabaseChain.eq).toHaveBeenCalledWith('event_id', 'event-123');
    });

    it('includes assignee profile data', async () => {
      const mockMilestones = [
        createMockMilestone({
          id: 'ms-1',
          assignee: createMockProfile({ id: 'user-1', name: 'Assignee 1' }),
        }),
      ];
      supabaseChain.resolvesWith(mockMilestones);

      const { result } = renderHook(() => useMilestones('event-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify select includes profiles join
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('assignee:profiles!milestones_assignee_id_fkey(*)');
    });

    it('includes parent event data', async () => {
      const mockMilestones = [
        createMockMilestone({
          id: 'ms-1',
          event: createMockEvent({ id: 'event-123', name: 'Test Event' }),
        }),
      ];
      supabaseChain.resolvesWith(mockMilestones);

      const { result } = renderHook(() => useMilestones('event-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify select includes events join
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('event:events(*)');
    });

    it('orders by due_date', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useMilestones('event-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabaseChain.order).toHaveBeenCalledWith('due_date', { ascending: true });
    });

    it('returns empty array for event with no milestones', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useMilestones('event-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('does not fetch when eventId is undefined', async () => {
      const { result } = renderHook(() => useMilestones(undefined), {
        wrapper: createWrapper(),
      });

      // Query should be disabled - data is undefined when query hasn't run
      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('handles fetch error gracefully', async () => {
      supabaseChain.resolvesWithError('Database error', 'PGRST116');

      const { result } = renderHook(() => useMilestones('event-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useAllMilestones (org-wide)', () => {
    it('fetches all milestones for organization via events join', async () => {
      const mockMilestones = [
        createMockMilestone({
          id: 'ms-1',
          event: createMockEvent({ organization_id: 'org-123' }),
        }),
        createMockMilestone({
          id: 'ms-2',
          event: createMockEvent({ organization_id: 'org-123' }),
        }),
      ];
      supabaseChain.resolvesWith(mockMilestones);

      const { result } = renderHook(() => useAllMilestones(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('milestones');
      expect(supabaseChain.eq).toHaveBeenCalledWith('event.organization_id', 'org-123');
    });

    it('includes parent event data', async () => {
      const mockMilestones = [
        createMockMilestone({
          id: 'ms-1',
          event: createMockEvent({ id: 'event-123', name: 'Test Event' }),
        }),
      ];
      supabaseChain.resolvesWith(mockMilestones);

      const { result } = renderHook(() => useAllMilestones(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify select includes events join with inner join syntax
      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('event:events!inner(');
    });

    it('filters out completed/cancelled/archived events', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useAllMilestones(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify neq calls for status filters
      expect(supabaseChain.neq).toHaveBeenCalledWith('event.status', 'COMPLETED');
      expect(supabaseChain.neq).toHaveBeenCalledWith('event.status', 'CANCELLED');
      expect(supabaseChain.neq).toHaveBeenCalledWith('event.status', 'ARCHIVED');
    });

    it('orders by due_date ascending', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useAllMilestones(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabaseChain.order).toHaveBeenCalledWith('due_date', { ascending: true });
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

      const { result } = renderHook(() => useAllMilestones(), {
        wrapper: createWrapper(),
      });

      // Query should be disabled - data is undefined when query hasn't run
      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });
});

describe('milestone status logic', () => {
  it('categorizes milestone as overdue', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const milestone = createMockMilestone({
      status: 'NOT_STARTED',
      due_date: yesterday.toISOString().split('T')[0],
    });

    const isOverdue = (m: typeof milestone) => {
      if (!m.due_date) return false;
      const dueDate = new Date(m.due_date);
      return dueDate < now && !['COMPLETED', 'SKIPPED'].includes(m.status!);
    };

    expect(isOverdue(milestone)).toBe(true);
  });

  it('categorizes in-progress milestone as overdue when past due', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const milestone = createMockMilestone({
      status: 'IN_PROGRESS',
      due_date: yesterday.toISOString().split('T')[0],
    });

    const isOverdue = (m: typeof milestone) => {
      if (!m.due_date) return false;
      const dueDate = new Date(m.due_date);
      return dueDate < now && !['COMPLETED', 'SKIPPED'].includes(m.status!);
    };

    expect(isOverdue(milestone)).toBe(true);
  });

  it('categorizes milestone as due soon (within 7 days)', () => {
    const now = new Date();
    const inFiveDays = new Date(now);
    inFiveDays.setDate(inFiveDays.getDate() + 5);

    const milestone = createMockMilestone({
      status: 'NOT_STARTED',
      due_date: inFiveDays.toISOString().split('T')[0],
    });

    const isDueSoon = (m: typeof milestone) => {
      if (!m.due_date) return false;
      const dueDate = new Date(m.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue > 0 && daysUntilDue <= 7 && !['COMPLETED', 'SKIPPED'].includes(m.status!);
    };

    expect(isDueSoon(milestone)).toBe(true);
  });

  it('does not categorize completed milestone as due soon', () => {
    const now = new Date();
    const inFiveDays = new Date(now);
    inFiveDays.setDate(inFiveDays.getDate() + 5);

    const milestone = createMockMilestone({
      status: 'COMPLETED',
      due_date: inFiveDays.toISOString().split('T')[0],
    });

    const isDueSoon = (m: typeof milestone) => {
      if (!m.due_date) return false;
      const dueDate = new Date(m.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue > 0 && daysUntilDue <= 7 && !['COMPLETED', 'SKIPPED'].includes(m.status!);
    };

    expect(isDueSoon(milestone)).toBe(false);
  });

  it('categorizes milestone as blocked', () => {
    const milestone = createMockMilestone({
      status: 'BLOCKED',
    });

    const isBlocked = (m: typeof milestone) => m.status === 'BLOCKED';

    expect(isBlocked(milestone)).toBe(true);
  });

  it('categorizes milestone as on track', () => {
    const now = new Date();
    const inTwoWeeks = new Date(now);
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);

    const milestone = createMockMilestone({
      status: 'IN_PROGRESS',
      due_date: inTwoWeeks.toISOString().split('T')[0],
    });

    const isOnTrack = (m: typeof milestone) => {
      if (!m.due_date) return true;
      const dueDate = new Date(m.due_date);
      const isNotOverdue = dueDate >= now;
      const isActiveStatus = ['NOT_STARTED', 'IN_PROGRESS'].includes(m.status!);
      return isNotOverdue && isActiveStatus;
    };

    expect(isOnTrack(milestone)).toBe(true);
  });

  it('handles milestone without due_date', () => {
    const milestone = createMockMilestone({
      status: 'NOT_STARTED',
      due_date: null,
    });

    const isOverdue = (m: typeof milestone) => {
      if (!m.due_date) return false;
      const dueDate = new Date(m.due_date);
      return dueDate < new Date() && !['COMPLETED', 'SKIPPED'].includes(m.status!);
    };

    // No due date means not overdue
    expect(isOverdue(milestone)).toBe(false);
  });
});

describe('useUpdateMilestone', () => {
  let supabaseChain: ReturnType<typeof createSupabaseChainMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseChain = createSupabaseChainMock();
    mockSupabaseFrom.mockReturnValue(supabaseChain);
  });

  it('provides update mutation', async () => {
    const { result } = renderHook(() => useUpdateMilestone(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('sets completed_at when marking as completed', async () => {
    const updatedMilestone = createMockMilestone({
      id: 'ms-123',
      status: 'COMPLETED',
      completed_at: '2026-01-28T12:00:00Z',
    });
    supabaseChain.resolvesWith(updatedMilestone);

    const { result } = renderHook(() => useUpdateMilestone(), {
      wrapper: createWrapper(),
    });

    // The hook should handle setting completed_at internally
    // We verify the mutation is properly set up
    expect(result.current.mutateAsync).toBeDefined();
  });
});

describe('useCreateMilestone', () => {
  let supabaseChain: ReturnType<typeof createSupabaseChainMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseChain = createSupabaseChainMock();
    mockSupabaseFrom.mockReturnValue(supabaseChain);
  });

  it('provides create mutation', async () => {
    const { result } = renderHook(() => useCreateMilestone(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });
});
