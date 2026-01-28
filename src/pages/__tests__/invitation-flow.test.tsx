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
    info: vi.fn(),
  },
}));

// Import after mocking
import { AuthProvider } from '@/contexts/AuthContext';
import JoinInvitation from '@/pages/JoinInvitation';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Component that shows current location
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

// Render helper
function renderJoinInvitation(token = 'valid-token') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const user = userEvent.setup();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/join/${token}`]}>
        <AuthProvider>
          <LocationDisplay />
          <Routes>
            <Route path="/join/:token" element={<JoinInvitation />} />
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/app" element={<ProtectedRoute><div>Dashboard</div></ProtectedRoute>} />
            <Route path="/app/events/:id" element={<div>Event Detail</div>} />
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

function setupInvitationQuery(invitation: any | null, error: any = null) {
  const invitationBuilder = createCustomBuilder({
    data: invitation,
    error,
  });

  const prevImpl = supabase.from.getMockImplementation();
  supabase.from.mockImplementation((table: string) => {
    if (table === 'invitations') return invitationBuilder;
    if (prevImpl) return prevImpl(table);
    return mockBuilder;
  });
}

describe('Invitation Flow', () => {
  beforeEach(() => {
    resetSupabaseMock();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Invalid Invitation', () => {
    it('shows error for invalid token', async () => {
      setupInvitationQuery(null, { message: 'Invitation not found' });

      renderJoinInvitation('invalid-token');

      await waitFor(() => {
        expect(screen.getByText(/invalid invitation/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('displays link to sign in page when invitation is invalid', async () => {
      setupInvitationQuery(null);

      renderJoinInvitation('invalid-token');

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /go to sign in/i })).toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });

  describe('Valid Invitation Display', () => {
    const mockInvitation = {
      id: 'inv-123',
      organization_id: 'org-123',
      event_id: null,
      email: 'invited@example.com',
      role: 'event_manager',
      message: null,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      status: 'pending',
      organization: { name: 'Test Organization' },
      event: null,
      inviter: { name: 'Admin User', email: 'admin@example.com' },
    };

    it('displays invitation details for valid token', async () => {
      setupInvitationQuery(mockInvitation);

      renderJoinInvitation('valid-token');

      // Wait for loading to complete (form appears)
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify the form is showing the signup mode by default
      expect(screen.getByRole('button', { name: /create account.*join/i })).toBeInTheDocument();
    });

    it('pre-fills email from invitation', async () => {
      setupInvitationQuery(mockInvitation);

      renderJoinInvitation('valid-token');

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toHaveValue('invited@example.com');
      }, { timeout: 5000 });
    });

    it('shows correct invitation email', async () => {
      setupInvitationQuery(mockInvitation);

      renderJoinInvitation('valid-token');

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
        // The email should be pre-filled from the invitation
        expect(emailInput.value).toBe('invited@example.com');
      }, { timeout: 5000 });
    });
  });

  describe('New User Sign Up Flow', () => {
    const mockInvitation = {
      id: 'inv-123',
      organization_id: 'org-123',
      event_id: null,
      email: 'invited@example.com',
      role: 'event_manager',
      message: null,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      status: 'pending',
      organization: { name: 'Test Organization' },
      event: null,
      inviter: { name: 'Admin User', email: 'admin@example.com' },
    };

    it('shows sign up form by default', async () => {
      setupInvitationQuery(mockInvitation);

      renderJoinInvitation('valid-token');

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create account.*join/i })).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('allows toggling to sign in form', async () => {
      setupInvitationQuery(mockInvitation);

      const { user } = renderJoinInvitation('valid-token');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /already have an account/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      await user.click(screen.getByRole('button', { name: /already have an account/i }));

      await waitFor(() => {
        expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in.*accept/i })).toBeInTheDocument();
      });
    });

    it('shows warning when using different email than invited', async () => {
      setupInvitationQuery(mockInvitation);

      const { user } = renderJoinInvitation('valid-token');

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'different@example.com');

      expect(screen.getByText(/different email than invited/i)).toBeInTheDocument();
    });

    it('calls signUp with correct parameters', async () => {
      setupInvitationQuery(mockInvitation);

      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: null },
        error: null,
      });

      const { user } = renderJoinInvitation('valid-token');

      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      await user.type(screen.getByLabelText(/name/i), 'New User');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account.*join/i }));

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'invited@example.com',
            password: 'password123',
          })
        );
      });
    });
  });

  describe('Existing User Sign In Flow', () => {
    const mockInvitation = {
      id: 'inv-123',
      organization_id: 'org-123',
      event_id: null,
      email: 'existing@example.com',
      role: 'event_manager',
      message: null,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      status: 'pending',
      organization: { name: 'Test Organization' },
      event: null,
      inviter: { name: 'Admin User', email: 'admin@example.com' },
    };

    it('calls signInWithPassword when in sign in mode', async () => {
      setupInvitationQuery(mockInvitation);

      const mockUser = { id: 'user-123', email: 'existing@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { user } = renderJoinInvitation('valid-token');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /already have an account/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      // Toggle to sign in mode
      await user.click(screen.getByRole('button', { name: /already have an account/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in.*accept/i })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in.*accept/i }));

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'existing@example.com',
          password: 'password123',
        });
      });
    });

    it('displays error on invalid credentials', async () => {
      const { toast } = await import('sonner');

      setupInvitationQuery(mockInvitation);

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const { user } = renderJoinInvitation('valid-token');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /already have an account/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      await user.click(screen.getByRole('button', { name: /already have an account/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in.*accept/i })).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in.*accept/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid login credentials');
      });
    });
  });
});
