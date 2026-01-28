import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase, mockBuilder, resetSupabaseMock, createCustomBuilder } from '@/test/__mocks__/supabase-client';

// Mock the supabase client module
vi.mock('@/integrations/supabase/client', () => ({
  supabase,
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocking
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Component that shows current location
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

// Render helper
function renderProtectedRoute(initialRoute = '/app') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <LocationDisplay />
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/onboarding" element={
              <ProtectedRoute requireOrg={false}>
                <div>Onboarding Page</div>
              </ProtectedRoute>
            } />
            <Route path="/app" element={
              <ProtectedRoute>
                <div>Dashboard</div>
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <div>Home</div>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { ...utils, queryClient };
}

function getCurrentPath() {
  return screen.getByTestId('location-display').textContent;
}

async function waitForNavigation(path: string) {
  await waitFor(() => {
    expect(getCurrentPath()).toBe(path);
  }, { timeout: 5000 });
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated Access', () => {
    it('redirects to /login when not authenticated', async () => {
      renderProtectedRoute('/app');

      await waitForNavigation('/login');
    });

    it('redirects root path to /login when not authenticated', async () => {
      renderProtectedRoute('/');

      await waitForNavigation('/login');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner while checking auth', async () => {
      supabase.auth.onAuthStateChange.mockImplementation(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }));

      renderProtectedRoute('/app');

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not redirect while loading', async () => {
      supabase.auth.onAuthStateChange.mockImplementation(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }));

      renderProtectedRoute('/app');

      expect(getCurrentPath()).toBe('/app');
    });
  });

  describe('Authenticated Access', () => {
    function setupAuthenticated() {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2026-01-01',
      };
      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      };

      supabase.auth.onAuthStateChange.mockImplementation((callback) => {
        setTimeout(() => callback('INITIAL_SESSION', mockSession), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const profileBuilder = createCustomBuilder({
        data: { id: 'user-123', email: 'test@example.com', name: 'Test' },
        error: null,
      });

      const membersBuilder = createCustomBuilder({
        data: [{
          id: 'member-123',
          organization_id: 'org-123',
          user_id: 'user-123',
          role: 'org_admin',
          organization: { id: 'org-123', name: 'Test Org', slug: 'test' },
        }],
        error: null,
      });

      supabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileBuilder;
        if (table === 'organization_members') return membersBuilder;
        return mockBuilder;
      });
    }

    it('renders protected content when authenticated with org', async () => {
      setupAuthenticated();

      renderProtectedRoute('/app');

      await waitFor(() => {
        expect(screen.queryByText('Dashboard')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('stays on /app route when authenticated', async () => {
      setupAuthenticated();

      renderProtectedRoute('/app');

      await waitFor(() => {
        expect(getCurrentPath()).toBe('/app');
      }, { timeout: 5000 });
    });
  });

  describe('No Organization Access', () => {
    function setupAuthenticatedNoOrgs() {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2026-01-01',
      };
      const mockSession = {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
      };

      supabase.auth.onAuthStateChange.mockImplementation((callback) => {
        setTimeout(() => callback('INITIAL_SESSION', mockSession), 0);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      const profileBuilder = createCustomBuilder({
        data: { id: 'user-123', email: 'test@example.com', name: 'Test' },
        error: null,
      });

      const membersBuilder = createCustomBuilder({
        data: [], // No organizations
        error: null,
      });

      supabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileBuilder;
        if (table === 'organization_members') return membersBuilder;
        return mockBuilder;
      });
    }

    it('redirects to /onboarding when authenticated but no org', async () => {
      setupAuthenticatedNoOrgs();

      renderProtectedRoute('/app');

      await waitForNavigation('/onboarding');
    });

    it('allows access to onboarding route without org', async () => {
      setupAuthenticatedNoOrgs();

      renderProtectedRoute('/onboarding');

      await waitFor(() => {
        expect(screen.queryByText('Onboarding Page')).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Public Routes', () => {
    it('allows public routes without auth', async () => {
      renderProtectedRoute('/login');

      await waitFor(() => {
        expect(getCurrentPath()).toBe('/login');
      });

      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });
});
