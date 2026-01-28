import { vi } from 'vitest';
import type { User, Session } from '@supabase/supabase-js';
import {
  createMockEvent,
  createMockTemplate,
  createMockMilestone,
  createMockInvitation,
  createMockOrganizationMember,
  createMockNotification,
  createMockDocument,
} from './test-utils';

// Types for mock results
interface SupabaseResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

interface SupabaseListResult<T> {
  data: T[] | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

// Builder pattern for Supabase query mocking
interface QueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
  containedBy: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
}

type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getSession: ReturnType<typeof vi.fn>;
    getUser: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signUp: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };
  functions: {
    invoke: ReturnType<typeof vi.fn>;
  };
  storage: {
    from: ReturnType<typeof vi.fn>;
  };
};

// Create a chainable query builder that resolves to specific data
function createQueryBuilder<T>(resolveData: T | null, resolveError: { message: string } | null = null): QueryBuilder {
  const result = { data: resolveData, error: resolveError };

  const builder: QueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: vi.fn((resolve) => Promise.resolve(result).then(resolve)),
  };

  // Make the builder itself thenable (for queries without .single())
  Object.defineProperty(builder, 'then', {
    value: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
    writable: true,
    configurable: true,
  });

  // Connect chainable methods to return builder
  builder.select.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  builder.upsert.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.neq.mockReturnValue(builder);
  builder.gt.mockReturnValue(builder);
  builder.gte.mockReturnValue(builder);
  builder.lt.mockReturnValue(builder);
  builder.lte.mockReturnValue(builder);
  builder.like.mockReturnValue(builder);
  builder.ilike.mockReturnValue(builder);
  builder.is.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.contains.mockReturnValue(builder);
  builder.containedBy.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.range.mockReturnValue(builder);

  return builder;
}

// Fluent builder for creating Supabase query mocks
export function mockSupabaseQuery<T = unknown>() {
  let resolveData: T | null = null;
  let resolveError: { message: string } | null = null;
  let targetTable: string | null = null;

  const builder = {
    from(table: string) {
      targetTable = table;
      return builder;
    },
    resolves(data: T) {
      resolveData = data;
      return builder;
    },
    rejects(error: string | { message: string }) {
      resolveError = typeof error === 'string' ? { message: error } : error;
      return builder;
    },
    build(): QueryBuilder {
      return createQueryBuilder(resolveData, resolveError);
    },
    // Get table name for use with mockSupabaseClient
    getTable() {
      return targetTable;
    },
  };

  return builder;
}

// Create a full mock Supabase client
export function createMockSupabaseClient(tableHandlers: Record<string, QueryBuilder> = {}): MockSupabaseClient {
  const defaultBuilder = createQueryBuilder(null);

  return {
    from: vi.fn((table: string) => tableHandlers[table] || defaultBuilder),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file' } }),
      }),
    },
  };
}

// Pre-built mock scenarios
export const supabaseMocks = {
  // Auth scenarios
  auth: {
    signIn: {
      success: (user: Partial<User> = {}) => {
        const mockUser: User = {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2026-01-01T00:00:00Z',
          ...user,
        } as User;
        const mockSession: Session = {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: mockUser,
        } as Session;
        return vi.fn().mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null });
      },
      error: (message = 'Invalid credentials') => {
        return vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: { message } });
      },
    },
    signUp: {
      success: (user: Partial<User> = {}) => {
        const mockUser: User = {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2026-01-01T00:00:00Z',
          ...user,
        } as User;
        return vi.fn().mockResolvedValue({ data: { user: mockUser, session: null }, error: null });
      },
      error: (message = 'Signup failed') => {
        return vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: { message } });
      },
    },
    signOut: {
      success: () => vi.fn().mockResolvedValue({ error: null }),
      error: (message = 'Signout failed') => vi.fn().mockResolvedValue({ error: { message } }),
    },
    getSession: {
      authenticated: (user: Partial<User> = {}) => {
        const mockUser: User = {
          id: 'user-123',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2026-01-01T00:00:00Z',
          ...user,
        } as User;
        const mockSession: Session = {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: mockUser,
        } as Session;
        return vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null });
      },
      unauthenticated: () => {
        return vi.fn().mockResolvedValue({ data: { session: null }, error: null });
      },
    },
  },

  // Events query scenarios
  events: {
    list: (events = [createMockEvent()]) => createQueryBuilder(events),
    single: (event = createMockEvent()) => createQueryBuilder(event),
    empty: () => createQueryBuilder([]),
    error: (message = 'Failed to fetch events') => createQueryBuilder(null, { message }),
  },

  // Templates query scenarios
  templates: {
    list: (templates = [createMockTemplate()]) => createQueryBuilder(templates),
    single: (template = createMockTemplate()) => createQueryBuilder(template),
    empty: () => createQueryBuilder([]),
    error: (message = 'Failed to fetch templates') => createQueryBuilder(null, { message }),
  },

  // Milestones query scenarios
  milestones: {
    list: (milestones = [createMockMilestone()]) => createQueryBuilder(milestones),
    single: (milestone = createMockMilestone()) => createQueryBuilder(milestone),
    empty: () => createQueryBuilder([]),
    error: (message = 'Failed to fetch milestones') => createQueryBuilder(null, { message }),
  },

  // Invitations query scenarios
  invitations: {
    list: (invitations = [createMockInvitation()]) => createQueryBuilder(invitations),
    single: (invitation = createMockInvitation()) => createQueryBuilder(invitation),
    empty: () => createQueryBuilder([]),
    error: (message = 'Failed to fetch invitations') => createQueryBuilder(null, { message }),
  },

  // Members query scenarios
  members: {
    list: (members = [createMockOrganizationMember()]) => createQueryBuilder(members),
    single: (member = createMockOrganizationMember()) => createQueryBuilder(member),
    empty: () => createQueryBuilder([]),
    error: (message = 'Failed to fetch members') => createQueryBuilder(null, { message }),
  },

  // Notifications query scenarios
  notifications: {
    list: (notifications = [createMockNotification()]) => createQueryBuilder(notifications),
    single: (notification = createMockNotification()) => createQueryBuilder(notification),
    empty: () => createQueryBuilder([]),
    error: (message = 'Failed to fetch notifications') => createQueryBuilder(null, { message }),
  },

  // Documents query scenarios
  documents: {
    list: (documents = [createMockDocument()]) => createQueryBuilder(documents),
    single: (document = createMockDocument()) => createQueryBuilder(document),
    empty: () => createQueryBuilder([]),
    error: (message = 'Failed to fetch documents') => createQueryBuilder(null, { message }),
  },
};

// Helper to setup Supabase mock for vi.mock
export function setupSupabaseMock(client: MockSupabaseClient = createMockSupabaseClient()) {
  return {
    supabase: client,
  };
}
