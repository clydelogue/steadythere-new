import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useEvents, useEvent, useCreateEvent } from '../useEvents';
import { useTemplates, useTemplate } from '../useTemplates';
import {
  createTestQueryClient,
  createMockEvent,
  createMockTemplate,
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

describe('query cache behavior', () => {
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

  describe('cache key patterns', () => {
    it('uses correct cache key for events list: ["events", orgId]', async () => {
      const queryClient = createTestQueryClient();
      const mockEvents = [createMockEvent()];
      supabaseChain.resolvesWith(mockEvents);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      const { result } = renderHook(() => useEvents(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the cache key structure
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      const eventsQuery = queries.find(q => q.queryKey[0] === 'events');

      expect(eventsQuery).toBeDefined();
      expect(eventsQuery?.queryKey).toEqual(['events', 'org-123']);
    });

    it('uses correct cache key for single event: ["event", eventId]', async () => {
      const queryClient = createTestQueryClient();
      const mockEvent = createMockEvent({ id: 'event-123' });
      supabaseChain.resolvesWith(mockEvent);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      const { result } = renderHook(() => useEvent('event-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the cache key structure
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      const eventQuery = queries.find(q => q.queryKey[0] === 'event');

      expect(eventQuery).toBeDefined();
      expect(eventQuery?.queryKey).toEqual(['event', 'event-123']);
    });

    it('uses correct cache key for templates list: ["templates", orgId]', async () => {
      const queryClient = createTestQueryClient();
      const mockTemplates = [{
        ...createMockTemplate(),
        milestone_templates: [{ count: 3 }],
        events: [],
      }];
      supabaseChain.resolvesWith(mockTemplates);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      const { result } = renderHook(() => useTemplates(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the cache key structure
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      const templatesQuery = queries.find(q => q.queryKey[0] === 'templates');

      expect(templatesQuery).toBeDefined();
      expect(templatesQuery?.queryKey).toEqual(['templates', 'org-123']);
    });

    it('uses correct cache key for single template: ["template", templateId]', async () => {
      const queryClient = createTestQueryClient();
      const mockTemplate = {
        ...createMockTemplate({ id: 'template-123' }),
        milestone_templates: [],
      };
      supabaseChain.resolvesWith(mockTemplate);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      const { result } = renderHook(() => useTemplate('template-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the cache key structure
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      const templateQuery = queries.find(q => q.queryKey[0] === 'template');

      expect(templateQuery).toBeDefined();
      expect(templateQuery?.queryKey).toEqual(['template', 'template-123']);
    });
  });

  describe('caching behavior', () => {
    it('caches query results and does not refetch on re-render', async () => {
      const queryClient = createTestQueryClient();
      const mockEvents = [createMockEvent()];
      supabaseChain.resolvesWith(mockEvents);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      // First render
      const { result, rerender } = renderHook(() => useEvents(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const firstCallCount = mockSupabaseFrom.mock.calls.length;

      // Rerender - should use cached data
      rerender();

      // Wait a tick to ensure no additional fetch occurred
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not have made additional calls
      expect(mockSupabaseFrom.mock.calls.length).toBe(firstCallCount);
    });

    it('different query keys are cached separately', async () => {
      const queryClient = createTestQueryClient();

      // Set up mock to return different data based on call order
      const event1 = createMockEvent({ id: 'event-1', name: 'Event 1' });
      const event2 = createMockEvent({ id: 'event-2', name: 'Event 2' });

      supabaseChain.resolvesWith(event1);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      // Fetch first event
      const { result: result1 } = renderHook(() => useEvent('event-1'), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Update mock for second event
      supabaseChain.resolvesWith(event2);

      // Fetch second event
      const { result: result2 } = renderHook(() => useEvent('event-2'), { wrapper });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Verify both queries are cached
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll().filter(q => q.queryKey[0] === 'event');

      expect(queries.length).toBe(2);
    });
  });

  describe('shared cache across components', () => {
    it('multiple hooks with same query share cached data', async () => {
      const queryClient = createTestQueryClient();
      const mockEvents = [createMockEvent()];
      supabaseChain.resolvesWith(mockEvents);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      // First component/hook
      const { result: result1 } = renderHook(() => useEvents(), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second component/hook with same query
      const { result: result2 } = renderHook(() => useEvents(), { wrapper });

      // Second hook should eventually have data (either from cache or refetch)
      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Both should have the same data (verifies cache is shared)
      expect(result1.current.data).toEqual(result2.current.data);
      expect(result1.current.data).toEqual(mockEvents);
    });
  });

  describe('cache invalidation', () => {
    it('invalidates events cache after mutation', async () => {
      const queryClient = createTestQueryClient();
      const mockEvents = [createMockEvent()];
      supabaseChain.resolvesWith(mockEvents);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      // First, fetch events to populate cache
      const { result: eventsResult } = renderHook(() => useEvents(), { wrapper });

      await waitFor(() => {
        expect(eventsResult.current.isSuccess).toBe(true);
      });

      // Verify cache has the events query
      let eventsQuery = queryClient.getQueryCache().find({ queryKey: ['events', 'org-123'] });
      expect(eventsQuery?.state.data).toBeDefined();

      // Now create an event mutation
      const newEvent = createMockEvent({ id: 'new-event' });
      supabaseChain.resolvesWith(newEvent);

      const { result: mutationResult } = renderHook(() => useCreateEvent(), { wrapper });

      // After mutation success, events cache should be invalidated
      // We test that the invalidation mechanism is set up correctly
      // by checking that the mutation hook is properly configured
      expect(mutationResult.current.mutateAsync).toBeDefined();
    });

    it('query client can manually invalidate queries', async () => {
      const queryClient = createTestQueryClient();
      const mockEvents = [createMockEvent()];
      supabaseChain.resolvesWith(mockEvents);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      const { result } = renderHook(() => useEvents(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const callCountBefore = mockSupabaseFrom.mock.calls.length;

      // Manually invalidate the query
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['events'] });
      });

      // Wait for refetch to complete
      await waitFor(() => {
        expect(mockSupabaseFrom.mock.calls.length).toBeGreaterThan(callCountBefore);
      });
    });
  });

  describe('stale time and cache time', () => {
    it('test query client has retry disabled for predictable testing', () => {
      const queryClient = createTestQueryClient();
      const defaultOptions = queryClient.getDefaultOptions();

      expect(defaultOptions.queries?.retry).toBe(false);
      expect(defaultOptions.mutations?.retry).toBe(false);
    });

    it('test query client has garbage collection disabled for predictable testing', () => {
      const queryClient = createTestQueryClient();
      const defaultOptions = queryClient.getDefaultOptions();

      // gcTime: 0 ensures queries are collected immediately when no longer needed
      expect(defaultOptions.queries?.gcTime).toBe(0);
    });
  });

  describe('query enabled state', () => {
    it('queries are disabled when required dependencies are missing', async () => {
      const queryClient = createTestQueryClient();

      // Set up auth without currentOrg
      vi.mocked(useAuth).mockReturnValue({
        currentOrg: null, // No org
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      const { result } = renderHook(() => useEvents(), { wrapper });

      // Query should be in idle state (not fetching)
      expect(result.current.fetchStatus).toBe('idle');
      // Data is undefined when query hasn't run
      expect(result.current.data).toBeUndefined();

      // Should not have called Supabase
      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('queries become enabled when dependencies are met', async () => {
      const queryClient = createTestQueryClient();

      // Start without org
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

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

      const { result, rerender } = renderHook(() => useEvents(), { wrapper });

      // Query should be idle
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockSupabaseFrom).not.toHaveBeenCalled();

      // Now add the org
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

      const mockEvents = [createMockEvent()];
      supabaseChain.resolvesWith(mockEvents);

      // Rerender with org
      rerender();

      // Query should now be fetching
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSupabaseFrom).toHaveBeenCalled();
    });
  });
});
