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
import Signup from '@/pages/Signup';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Component that shows current location
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

// Render helper
function renderSignup(initialRoute = '/signup') {
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
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<div>Login Page</div>} />
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
  // Wait for loading to complete (spinner to disappear and form to appear)
  await waitFor(() => {
    expect(screen.queryByTestId('location-display')).toBeInTheDocument();
    // The form has a Name input when loaded
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  }, { timeout: 5000 });
}

async function fillSignupForm(user: ReturnType<typeof userEvent.setup>, name: string, email: string, password: string) {
  const nameInput = screen.getByLabelText(/name/i);
  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);

  await user.type(nameInput, name);
  await user.type(emailInput, email);
  await user.type(passwordInput, password);
}

describe('Sign Up Flow', () => {
  beforeEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders sign up form with all required fields', async () => {
      renderSignup();

      await waitForFormToLoad();

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('shows loading spinner while checking auth', async () => {
      // Don't fire auth callback - stay in loading
      supabase.auth.onAuthStateChange.mockImplementation(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }));

      renderSignup();

      // Check for spinner by class
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('has a link to sign in page', async () => {
      renderSignup();

      await waitForFormToLoad();

      const signInLink = screen.getByRole('link', { name: /already have an account/i });
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Form Validation', () => {
    it('requires all form fields', async () => {
      renderSignup();

      await waitForFormToLoad();

      expect(screen.getByLabelText(/name/i)).toBeRequired();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/password/i)).toBeRequired();
    });

    it('has email type on email field', async () => {
      renderSignup();

      await waitForFormToLoad();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    });

    it('has minimum length on password field', async () => {
      renderSignup();

      await waitForFormToLoad();

      expect(screen.getByLabelText(/password/i)).toHaveAttribute('minLength', '6');
    });

    it('displays password requirements hint', async () => {
      renderSignup();

      await waitForFormToLoad();

      expect(screen.getByText(/minimum 6 characters/i)).toBeInTheDocument();
    });
  });

  describe('Successful Sign Up', () => {
    it('calls Supabase signUp with correct parameters', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: null },
        error: null,
      });

      const { user } = renderSignup();

      await waitForFormToLoad();

      await fillSignupForm(user, 'New User', 'newuser@example.com', 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
          options: expect.objectContaining({
            data: { name: 'New User' },
          }),
        });
      });
    });

    it('shows success toast after successful signup', async () => {
      const { toast } = await import('sonner');

      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: null },
        error: null,
      });

      const { user } = renderSignup();

      await waitForFormToLoad();

      await fillSignupForm(user, 'New User', 'newuser@example.com', 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it('navigates to onboarding after successful signup', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: null },
        error: null,
      });

      const { user } = renderSignup();

      await waitForFormToLoad();

      await fillSignupForm(user, 'New User', 'newuser@example.com', 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitForNavigation('/onboarding');
    });

    it('disables submit button while submitting', async () => {
      // Make signup hang
      supabase.auth.signUp.mockImplementation(
        () => new Promise(() => {})
      );

      const { user } = renderSignup();

      await waitForFormToLoad();

      await fillSignupForm(user, 'New User', 'newuser@example.com', 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Sign Up Errors', () => {
    it('displays error message when signup fails', async () => {
      const { toast } = await import('sonner');

      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      });

      const { user } = renderSignup();

      await waitForFormToLoad();

      await fillSignupForm(user, 'Existing User', 'existing@example.com', 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Email already registered');
      });
    });

    it('re-enables submit button after error', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Error' },
      });

      const { user } = renderSignup();

      await waitForFormToLoad();

      await fillSignupForm(user, 'Test User', 'test@example.com', 'password123');
      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
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

      // Setup profile and org queries
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

      renderSignup();

      await waitForNavigation('/app');
    });
  });
});
