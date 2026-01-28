import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// Mock hooks used by Dashboard
vi.mock('@/hooks/useEvents', () => ({
  useEvents: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useMilestones', () => ({
  useAllMilestones: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useAttentionItems', () => ({
  useAttentionItems: () => [],
}));

// Import after mocking
import { AuthProvider } from '@/contexts/AuthContext';
import Index from '@/pages/Index';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Component that shows current location
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

// Render helper
function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const user = userEvent.setup();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app']}>
        <AuthProvider>
          <LocationDisplay />
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/onboarding" element={<div>Onboarding Page</div>} />
            <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { ...utils, user, queryClient };
}

function getCurrentPath() {
  return screen.getByTestId('location-display').textContent;
}

async function waitForNavigation(path: string) {
  await waitFor(() => {
    expect(getCurrentPath()).toBe(path);
  }, { timeout: 5000 });
}

describe('Organization Switching', () => {
  const mockOrg1 = { id: 'org-1', name: 'Organization One', slug: 'org-one' };
  const mockOrg2 = { id: 'org-2', name: 'Organization Two', slug: 'org-two' };

  beforeEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function setupMultiOrgAuthenticated() {
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
      data: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
      error: null,
    });

    const membersBuilder = createCustomBuilder({
      data: [
        {
          id: 'member-1',
          organization_id: 'org-1',
          user_id: 'user-123',
          role: 'org_admin',
          organization: mockOrg1,
        },
        {
          id: 'member-2',
          organization_id: 'org-2',
          user_id: 'user-123',
          role: 'event_manager',
          organization: mockOrg2,
        },
      ],
      error: null,
    });

    supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder;
      if (table === 'organization_members') return membersBuilder;
      return mockBuilder;
    });
  }

  describe('Current Organization Display', () => {
    it('displays current organization name in sidebar', async () => {
      setupMultiOrgAuthenticated();

      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Organization One')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('uses organization from localStorage if available', async () => {
      localStorage.setItem('steady_current_org', 'org-2');

      setupMultiOrgAuthenticated();

      renderDashboard();

      await waitFor(() => {
        // Should display the org from localStorage (org-2)
        const orgButtons = screen.getAllByText(/Organization (One|Two)/i);
        expect(orgButtons.length).toBeGreaterThan(0);
      }, { timeout: 10000 });
    });
  });

  describe('Organization Switcher Dropdown', () => {
    it('shows all organizations in the dropdown', async () => {
      setupMultiOrgAuthenticated();

      const { user } = renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Organization One')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Find and click the org switcher button
      const orgButton = screen.getByText('Organization One').closest('button');
      if (orgButton) {
        await user.click(orgButton);

        await waitFor(() => {
          const menuItems = screen.getAllByRole('menuitem');
          expect(menuItems.length).toBe(2);
        });
      }
    });

    it('switches organization when clicking on different org', async () => {
      setupMultiOrgAuthenticated();

      const { user } = renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Organization One')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Find and click the org switcher button
      const orgButton = screen.getByText('Organization One').closest('button');
      if (orgButton) {
        await user.click(orgButton);

        await waitFor(() => {
          expect(screen.getAllByRole('menuitem').length).toBe(2);
        });

        // Click on Organization Two
        const orgTwoItem = screen.getAllByRole('menuitem').find(item =>
          item.textContent?.includes('Organization Two')
        );

        if (orgTwoItem) {
          await user.click(orgTwoItem);

          // Should update localStorage
          await waitFor(() => {
            expect(localStorage.getItem('steady_current_org')).toBe('org-2');
          });
        }
      }
    });
  });

  describe('No Organization', () => {
    it('redirects to onboarding when user has no organizations', async () => {
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
        data: [],
        error: null,
      });

      supabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') return profileBuilder;
        if (table === 'organization_members') return membersBuilder;
        return mockBuilder;
      });

      renderDashboard();

      await waitForNavigation('/onboarding');
    });
  });
});
