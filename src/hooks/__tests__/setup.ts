/**
 * Hook Testing Setup
 *
 * This file provides reusable patterns for testing React Query hooks
 * that interact with Supabase.
 *
 * Pattern:
 * 1. Mock the Supabase client before each test
 * 2. Mock the AuthContext to provide user/org context
 * 3. Use the chainable Supabase mock to set up expected responses
 * 4. Render the hook with createWrapper() for QueryClient context
 * 5. Use waitFor() to wait for async operations
 */

import { vi, type Mock } from 'vitest';

// Re-export test utilities for convenience
export {
  createWrapper,
  createTestQueryClient,
  createMockOrganization,
  createMockUser,
  createMockEvent,
  createMockMilestone,
  createMockTemplate,
  createMockProfile,
  createMockOrganizationMember,
  createMockInvitation,
  createMockMilestoneTemplate,
} from '@/test/test-utils';

// Import for local use
import {
  createMockOrganization,
  createMockUser,
  createMockProfile,
} from '@/test/test-utils';

// Standard mock setup for hook tests
export interface HookTestContext {
  mockOrg: ReturnType<typeof createMockOrganization>;
  mockUser: ReturnType<typeof createMockUser>;
  mockProfile: ReturnType<typeof createMockProfile>;
}

export function setupHookTest(): HookTestContext {
  const mockOrg = createMockOrganization({ id: 'org-123' });
  const mockUser = createMockUser({ id: 'user-123', email: 'test@example.com' });
  const mockProfile = createMockProfile({ id: 'user-123', email: 'test@example.com' });

  return { mockOrg, mockUser, mockProfile };
}

/**
 * Creates a chainable mock that mimics Supabase's query builder pattern.
 *
 * Usage:
 * ```typescript
 * const mockChain = createSupabaseChainMock();
 * mockChain.resolvesWith([{ id: '1', name: 'Test' }]);
 * vi.mocked(supabase.from).mockReturnValue(mockChain as any);
 * ```
 */
export function createSupabaseChainMock() {
  let data: unknown = null;
  let error: { message: string; code?: string } | null = null;

  const chain = {
    // Query builder methods - all return the chain
    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    like: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    is: vi.fn(() => chain),
    in: vi.fn(() => chain),
    contains: vi.fn(() => chain),
    containedBy: vi.fn(() => chain),
    range: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    match: vi.fn(() => chain),
    not: vi.fn(() => chain),
    or: vi.fn(() => chain),
    filter: vi.fn(() => chain),

    // Terminal methods - return promises with data
    single: vi.fn(() => Promise.resolve({ data, error })),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error })),

    // Make the chain itself thenable for queries without terminal methods
    then: vi.fn((resolve: (value: { data: unknown; error: typeof error }) => void) => {
      return Promise.resolve().then(() => resolve({ data, error }));
    }),

    // Fluent setters for test setup
    resolvesWith(responseData: unknown) {
      data = responseData;
      error = null;
      return chain;
    },

    resolvesWithError(errorMessage: string, errorCode?: string) {
      data = null;
      error = { message: errorMessage, code: errorCode };
      return chain;
    },

    // Getters for assertions
    getData: () => data,
    getError: () => error,
  };

  return chain;
}

/**
 * Creates a mock Supabase client for testing.
 * This creates a complete mock that can be used with vi.mock()
 */
export function createMockSupabaseClient() {
  const chainMock = createSupabaseChainMock();

  return {
    from: vi.fn(() => chainMock),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
    // Expose the chain mock for test setup
    _chainMock: chainMock,
  };
}

/**
 * Helper to assert that a specific Supabase method was called with expected arguments.
 *
 * Usage:
 * ```typescript
 * assertSupabaseCall(mockChain.eq, 'organization_id', 'org-123');
 * ```
 */
export function assertSupabaseCall(mockFn: Mock, ...expectedArgs: unknown[]) {
  expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
}

/**
 * Helper to create mock session for authenticated tests
 */
export function createMockSession(userId = 'user-123') {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: { name: 'Test User' },
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

/**
 * Helper to wait for React Query to settle
 * Use this when you need to wait for background refetches or cache updates
 */
export async function waitForQueryToSettle(ms = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
