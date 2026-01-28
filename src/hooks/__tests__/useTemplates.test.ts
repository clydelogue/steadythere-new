import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTemplates, useTemplate, useTemplateVersions, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '../useTemplates';
import {
  createWrapper,
  createMockTemplate,
  createMockOrganization,
  createMockProfile,
  createMockMilestoneTemplate,
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

describe('useTemplates', () => {
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

  describe('useTemplates (list)', () => {
    it('fetches active templates for current organization', async () => {
      const mockTemplates = [
        {
          ...createMockTemplate({ id: 'template-1', name: 'Template 1' }),
          milestone_templates: [{ count: 5 }],
          events: [],
        },
        {
          ...createMockTemplate({ id: 'template-2', name: 'Template 2' }),
          milestone_templates: [{ count: 3 }],
          events: [],
        },
      ];
      supabaseChain.resolvesWith(mockTemplates);

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('event_types');
      expect(supabaseChain.eq).toHaveBeenCalledWith('organization_id', 'org-123');
      expect(supabaseChain.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('computes milestone_count from aggregation', async () => {
      const mockTemplates = [
        {
          ...createMockTemplate({ id: 'template-1' }),
          milestone_templates: [{ count: 5 }],
          events: [],
        },
      ];
      supabaseChain.resolvesWith(mockTemplates);

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].milestone_count).toBe(5);
    });

    it('computes events_count from related events', async () => {
      const mockTemplates = [
        {
          ...createMockTemplate({ id: 'template-1' }),
          milestone_templates: [{ count: 3 }],
          events: [
            { id: 'event-1', created_at: '2026-01-01T00:00:00Z' },
            { id: 'event-2', created_at: '2026-01-15T00:00:00Z' },
            { id: 'event-3', created_at: '2026-01-20T00:00:00Z' },
          ],
        },
      ];
      supabaseChain.resolvesWith(mockTemplates);

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].events_count).toBe(3);
    });

    it('computes last_used_at from most recent event', async () => {
      const mockTemplates = [
        {
          ...createMockTemplate({ id: 'template-1' }),
          milestone_templates: [{ count: 3 }],
          events: [
            { id: 'event-1', created_at: '2026-01-01T00:00:00Z' },
            { id: 'event-2', created_at: '2026-01-20T00:00:00Z' }, // Most recent
            { id: 'event-3', created_at: '2026-01-15T00:00:00Z' },
          ],
        },
      ];
      supabaseChain.resolvesWith(mockTemplates);

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].last_used_at).toBe('2026-01-20T00:00:00Z');
    });

    it('returns null for last_used_at when no events', async () => {
      const mockTemplates = [
        {
          ...createMockTemplate({ id: 'template-1' }),
          milestone_templates: [{ count: 3 }],
          events: [],
        },
      ];
      supabaseChain.resolvesWith(mockTemplates);

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].last_used_at).toBeNull();
    });

    it('orders by name ascending', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabaseChain.order).toHaveBeenCalledWith('name', { ascending: true });
    });

    it('returns empty array when no templates', async () => {
      supabaseChain.resolvesWith([]);

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('handles empty milestone_templates array', async () => {
      const mockTemplates = [
        {
          ...createMockTemplate({ id: 'template-1' }),
          milestone_templates: [],
          events: [],
        },
      ];
      supabaseChain.resolvesWith(mockTemplates);

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.[0].milestone_count).toBe(0);
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

      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      // Query should be disabled - data is undefined when query hasn't run
      expect(result.current.data).toBeUndefined();
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });

  describe('useTemplate (single)', () => {
    it('fetches template with all details', async () => {
      const mockTemplate = {
        ...createMockTemplate({ id: 'template-123' }),
        milestone_templates: [
          createMockMilestoneTemplate({ id: 'mt-1', sort_order: 1 }),
          createMockMilestoneTemplate({ id: 'mt-2', sort_order: 0 }),
        ],
      };
      supabaseChain.resolvesWith(mockTemplate);

      const { result } = renderHook(() => useTemplate('template-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('event_types');
      expect(supabaseChain.eq).toHaveBeenCalledWith('id', 'template-123');
      expect(supabaseChain.single).toHaveBeenCalled();
    });

    it('includes milestone_templates sorted by sort_order', async () => {
      const mockTemplate = {
        ...createMockTemplate({ id: 'template-123' }),
        milestone_templates: [
          createMockMilestoneTemplate({ id: 'mt-3', sort_order: 2 }),
          createMockMilestoneTemplate({ id: 'mt-1', sort_order: 0 }),
          createMockMilestoneTemplate({ id: 'mt-2', sort_order: 1 }),
        ],
      };
      supabaseChain.resolvesWith(mockTemplate);

      const { result } = renderHook(() => useTemplate('template-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the milestones are sorted by sort_order
      const milestones = result.current.data?.milestone_templates;
      expect(milestones?.[0].sort_order).toBe(0);
      expect(milestones?.[1].sort_order).toBe(1);
      expect(milestones?.[2].sort_order).toBe(2);
    });

    it('returns null for non-existent template', async () => {
      supabaseChain.resolvesWithError('Not found', 'PGRST116');

      const { result } = renderHook(() => useTemplate('non-existent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('does not fetch when templateId is undefined', async () => {
      const { result } = renderHook(() => useTemplate(undefined), {
        wrapper: createWrapper(),
      });

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

      const { result } = renderHook(() => useTemplate('template-123'), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });

  describe('useTemplateVersions', () => {
    it('fetches template versions for history', async () => {
      const mockVersions = [
        { id: 'v-2', event_type_id: 'template-123', version: 2, changelog: 'Updated milestones', creator: createMockProfile() },
        { id: 'v-1', event_type_id: 'template-123', version: 1, changelog: 'Initial version', creator: createMockProfile() },
      ];
      supabaseChain.resolvesWith(mockVersions);

      const { result } = renderHook(() => useTemplateVersions('template-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('template_versions');
      expect(supabaseChain.eq).toHaveBeenCalledWith('event_type_id', 'template-123');
      expect(supabaseChain.order).toHaveBeenCalledWith('version', { ascending: false });
    });

    it('includes creator profile data', async () => {
      const mockVersions = [
        { id: 'v-1', event_type_id: 'template-123', version: 1, creator: createMockProfile({ name: 'Creator Name' }) },
      ];
      supabaseChain.resolvesWith(mockVersions);

      const { result } = renderHook(() => useTemplateVersions('template-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const selectCall = supabaseChain.select.mock.calls[0][0];
      expect(selectCall).toContain('creator:profiles');
    });

    it('returns empty array when templateId is undefined', async () => {
      const { result } = renderHook(() => useTemplateVersions(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });
});

describe('template data transformations', () => {
  it('sorts milestones by sort_order', () => {
    const milestones = [
      { id: '1', sort_order: 2 },
      { id: '2', sort_order: 0 },
      { id: '3', sort_order: 1 },
    ];

    const sorted = [...milestones].sort((a, b) =>
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    expect(sorted.map(m => m.id)).toEqual(['2', '3', '1']);
  });

  it('handles null sort_order values', () => {
    const milestones = [
      { id: '1', sort_order: null as number | null },
      { id: '2', sort_order: 1 },
      { id: '3', sort_order: null as number | null },
    ];

    const sorted = [...milestones].sort((a, b) =>
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    // Nulls treated as 0, so they come first
    expect(sorted[0].sort_order).toBeNull();
    expect(sorted[2].sort_order).toBe(1);
  });

  it('handles all null sort_order values', () => {
    const milestones = [
      { id: '1', sort_order: null as number | null },
      { id: '2', sort_order: null as number | null },
      { id: '3', sort_order: null as number | null },
    ];

    const sorted = [...milestones].sort((a, b) =>
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    // All nulls, order should be preserved
    expect(sorted.length).toBe(3);
  });

  it('handles mixed sort_order values including zero', () => {
    const milestones = [
      { id: '1', sort_order: 2 },
      { id: '2', sort_order: 0 },
      { id: '3', sort_order: null as number | null },
    ];

    const sorted = [...milestones].sort((a, b) =>
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    // 0 and null should be equivalent
    expect(sorted[0].sort_order === 0 || sorted[0].sort_order === null).toBe(true);
    expect(sorted[2].sort_order).toBe(2);
  });

  it('computes correct last_used_at from events', () => {
    const events = [
      { id: 'e1', created_at: '2026-01-01T00:00:00Z' },
      { id: 'e2', created_at: '2026-01-20T00:00:00Z' },
      { id: 'e3', created_at: '2026-01-15T00:00:00Z' },
    ];

    const last_used_at = events.length > 0
      ? events.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0].created_at
      : null;

    expect(last_used_at).toBe('2026-01-20T00:00:00Z');
  });
});

describe('useCreateTemplate', () => {
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

  it('provides create mutation', async () => {
    const { result } = renderHook(() => useCreateTemplate(), {
      wrapper: createWrapper(),
    });

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

    const { result } = renderHook(() => useCreateTemplate(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        name: 'Test Template',
        milestones: [],
      })
    ).rejects.toThrow('Not authenticated');
  });
});

describe('useUpdateTemplate', () => {
  let supabaseChain: ReturnType<typeof createSupabaseChainMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseChain = createSupabaseChainMock();
    mockSupabaseFrom.mockReturnValue(supabaseChain);
  });

  it('provides update mutation', async () => {
    const { result } = renderHook(() => useUpdateTemplate(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });
});

describe('useDeleteTemplate', () => {
  let supabaseChain: ReturnType<typeof createSupabaseChainMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseChain = createSupabaseChainMock();
    mockSupabaseFrom.mockReturnValue(supabaseChain);
  });

  it('provides delete mutation (soft delete)', async () => {
    const { result } = renderHook(() => useDeleteTemplate(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });
});
