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

// Import after mocking
import { AuthProvider } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Component that shows current location
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

// Render helper
function renderLogin(initialRoute = '/login') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const user = userEvent.setup();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <LocationDisplay />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<div>Signup Page</div>} />
            <Route path="/onboarding" element={<div>Onboarding Page</div>} />
            <Route path="/app" element={<ProtectedRoute><div>Dashboard</div></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { ...utils, user, queryClient };
}

// Helper functions
function getCurrentPath() {
  return screen.getByTestId('location-display').textContent;
}

async function waitForNavigation(path: string) {
  await waitFor(() => {
    expect(getCurrentPath()).toBe(path);
  }, { timeout: 5000 });
}

async function waitForFormToLoad() {
  await waitFor(() => {
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  }, { timeout: 5000 });
}

describe('Sign In Flow', () => {
  beforeEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders sign in form with all required fields', async () => {
      renderLogin();

      await waitForFormToLoad();

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('shows loading spinner while checking auth', async () => {
      supabase.auth.onAuthStateChange.mockImplementation(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }));

      renderLogin();

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('has a link to sign up page', async () => {
      renderLogin();

      await waitForFormToLoad();

      const signUpLink = screen.getByRole('link', { name: /don't have an account/i });
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', '/signup');
    });
  });

  describe('Successful Sign In', () => {
    it('calls Supabase signInWithPassword with correct parameters', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { user } = renderLogin();

      await waitForFormToLoad();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('shows success toast after successful signin', async () => {
      const { toast } = await import('sonner');

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
        error: null,
      });

      const { user } = renderLogin();

      await waitForFormToLoad();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });

  describe('Sign In Errors', () => {
    it('displays error message on invalid credentials', async () => {
      const { toast } = await import('sonner');

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const { user } = renderLogin();

      await waitForFormToLoad();

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid login credentials');
      });
    });
  });

  describe('Already Authenticated', () => {
    it('redirects to /app if user is already logged in', async () => {
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

      renderLogin();

      await waitForNavigation('/app');
    });
  });
});
