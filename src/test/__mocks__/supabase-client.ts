import { vi } from 'vitest';

// Create a mock query builder that can be chained
function createMockBuilder() {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  // Make builder thenable
  Object.defineProperty(builder, 'then', {
    value: (resolve: Function) => Promise.resolve({ data: [], error: null }).then(resolve as any),
    writable: true,
    configurable: true,
  });

  return builder;
}

// The mock supabase client - this gets exported and can be configured in tests
export const mockBuilder = createMockBuilder();

export const supabase = {
  from: vi.fn(() => mockBuilder),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn((callback) => {
      // By default, fire with no session
      setTimeout(() => callback('INITIAL_SESSION', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  },
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file' } }),
    }),
  },
};

// Helper to reset all mocks
export function resetSupabaseMock() {
  vi.clearAllMocks();

  // Reset thenable on builder
  Object.defineProperty(mockBuilder, 'then', {
    value: (resolve: Function) => Promise.resolve({ data: [], error: null }).then(resolve as any),
    writable: true,
    configurable: true,
  });

  mockBuilder.single.mockResolvedValue({ data: null, error: null });
  mockBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

  supabase.auth.onAuthStateChange.mockImplementation((callback) => {
    setTimeout(() => callback('INITIAL_SESSION', null), 0);
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
}

// Helper to create a custom query builder with specific responses
export function createCustomBuilder(response: { data: any; error: any }) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };

  Object.defineProperty(builder, 'then', {
    value: (resolve: Function) => Promise.resolve(response).then(resolve as any),
    writable: true,
    configurable: true,
  });

  return builder;
}
