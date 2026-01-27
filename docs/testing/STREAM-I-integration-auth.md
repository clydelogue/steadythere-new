# Stream I: Integration Tests - Auth Flows

**Branch name:** `test/integration-auth`
**Effort:** Medium (2-3 sessions)
**Dependencies:** Stream A (infrastructure) helpful, Stream B (permissions) helpful
**Why this matters:** Auth bugs = security bugs. Invitation flow is complex.

---

## Goal

Test complete authentication flows end-to-end within the React app. These are integration tests that render full pages with mocked Supabase, testing the interaction between:
- AuthContext
- ProtectedRoute
- Auth pages
- Invitation flow
- Onboarding flow

---

## Flows to Test

1. **Sign Up** → Onboarding → Dashboard
2. **Sign In** → Dashboard
3. **Invitation Accept (new user)** → Sign Up → Auto-join org
4. **Invitation Accept (existing user)** → Sign In → Auto-join org
5. **Sign Out** → Redirect to auth
6. **Protected Route** → Redirect when unauthenticated
7. **Org Switching** → Data refresh

---

## Tasks

### Task 1: Set Up Integration Test Pattern

**File:** `src/test/integration-utils.tsx` (new file)

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { vi } from 'vitest';

interface RenderAppOptions {
  initialRoute?: string;
  mockSupabase?: any;
  mockAuthState?: any;
}

export function renderApp(options: RenderAppOptions = {}) {
  const { initialRoute = '/', mockSupabase, mockAuthState } = options;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  // Set up Supabase mock
  if (mockSupabase) {
    vi.mock('@/integrations/supabase/client', () => ({
      supabase: mockSupabase,
    }));
  }

  const user = userEvent.setup();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/join/:token" element={<JoinInvitation />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            {/* Add other routes as needed */}
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return {
    ...utils,
    user,
    queryClient,
  };
}

// Helper to wait for navigation
export async function waitForNavigation(path: string) {
  await waitFor(() => {
    expect(window.location.pathname).toBe(path);
  });
}

// Helper to fill auth form
export async function fillAuthForm(user: any, email: string, password: string) {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
}
```

**Acceptance criteria:**
- Full app render with routing
- Easy route testing
- User event helpers
- Navigation assertions

---

### Task 2: Test Sign Up Flow

**File:** `src/pages/__tests__/auth-signup.test.tsx` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderApp, fillAuthForm } from '@/test/integration-utils';

describe('Sign Up Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign up form', async () => {
    renderApp({ initialRoute: '/auth' });

    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const { user } = renderApp({ initialRoute: '/auth' });

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });

  it('validates password requirements', async () => {
    const { user } = renderApp({ initialRoute: '/auth' });

    await fillAuthForm(user, 'test@example.com', '123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(screen.getByText(/password.*characters/i)).toBeInTheDocument();
  });

  it('calls Supabase signUp on valid submission', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });

    const { user } = renderApp({
      initialRoute: '/auth',
      mockSupabase: {
        auth: { signUp: mockSignUp },
      },
    });

    await fillAuthForm(user, 'test@example.com', 'validpassword123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'validpassword123',
      options: expect.any(Object),
    });
  });

  it('redirects to onboarding after successful signup', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
      error: null
    });

    const { user } = renderApp({
      initialRoute: '/auth',
      mockSupabase: {
        auth: { signUp: mockSignUp },
      },
    });

    await fillAuthForm(user, 'test@example.com', 'validpassword123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/create.*organization/i)).toBeInTheDocument();
    });
  });

  it('displays error message on signup failure', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Email already registered' }
    });

    const { user } = renderApp({
      initialRoute: '/auth',
      mockSupabase: {
        auth: { signUp: mockSignUp },
      },
    });

    await fillAuthForm(user, 'existing@example.com', 'validpassword123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
  });
});
```

**Acceptance criteria:**
- Form validation tested
- Supabase auth.signUp called correctly
- Success redirect works
- Error handling works

---

### Task 3: Test Sign In Flow

**File:** `src/pages/__tests__/auth-signin.test.tsx` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderApp, fillAuthForm } from '@/test/integration-utils';

describe('Sign In Flow', () => {
  it('renders sign in form', async () => {
    renderApp({ initialRoute: '/auth' });

    // Toggle to sign in mode if needed
    const signInTab = screen.queryByRole('tab', { name: /sign in/i });
    if (signInTab) await user.click(signInTab);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('calls Supabase signInWithPassword on submission', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' }, session: {} },
      error: null
    });

    const { user } = renderApp({
      initialRoute: '/auth',
      mockSupabase: {
        auth: { signInWithPassword: mockSignIn },
      },
    });

    await fillAuthForm(user, 'test@example.com', 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('redirects to dashboard after successful signin', async () => {
    // Mock authenticated state with existing org
    const { user } = renderApp({
      initialRoute: '/auth',
      mockAuthState: {
        user: { id: 'user-123' },
        session: { access_token: 'token' },
        organizations: [{ id: 'org-123', name: 'Test Org' }],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  it('redirects to onboarding if user has no organizations', async () => {
    const { user } = renderApp({
      initialRoute: '/auth',
      mockAuthState: {
        user: { id: 'user-123' },
        session: { access_token: 'token' },
        organizations: [], // No orgs
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/create.*organization/i)).toBeInTheDocument();
    });
  });

  it('displays error on invalid credentials', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' }
    });

    const { user } = renderApp({
      initialRoute: '/auth',
      mockSupabase: {
        auth: { signInWithPassword: mockSignIn },
      },
    });

    await fillAuthForm(user, 'test@example.com', 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid.*credentials/i)).toBeInTheDocument();
  });
});
```

**Acceptance criteria:**
- Sign in form tested
- Supabase auth.signInWithPassword called
- Dashboard redirect works
- Onboarding redirect for new users
- Error handling works

---

### Task 4: Test Protected Route

**File:** `src/components/__tests__/ProtectedRoute.test.tsx` (new file)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderApp } from '@/test/integration-utils';

describe('ProtectedRoute', () => {
  it('redirects to /auth when not authenticated', async () => {
    renderApp({
      initialRoute: '/',
      mockAuthState: {
        user: null,
        session: null,
        isLoading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while checking auth', async () => {
    renderApp({
      initialRoute: '/',
      mockAuthState: {
        user: null,
        session: null,
        isLoading: true,
      },
    });

    expect(screen.getByRole('status')).toBeInTheDocument(); // spinner
  });

  it('renders children when authenticated', async () => {
    renderApp({
      initialRoute: '/',
      mockAuthState: {
        user: { id: 'user-123' },
        session: { access_token: 'token' },
        currentOrg: { id: 'org-123', name: 'Test Org' },
        isLoading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  it('redirects to /onboarding when authenticated but no org', async () => {
    renderApp({
      initialRoute: '/',
      mockAuthState: {
        user: { id: 'user-123' },
        session: { access_token: 'token' },
        currentOrg: null,
        organizations: [],
        isLoading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/create.*organization/i)).toBeInTheDocument();
    });
  });
});
```

**Acceptance criteria:**
- Unauthenticated redirect tested
- Loading state tested
- Authenticated render tested
- No-org redirect tested

---

### Task 5: Test Invitation Flow (New User)

**File:** `src/pages/__tests__/invitation-new-user.test.tsx` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderApp } from '@/test/integration-utils';

describe('Invitation Flow - New User', () => {
  const validToken = 'valid-invitation-token';
  const mockInvitation = {
    id: 'inv-123',
    email: 'invited@example.com',
    role: 'event_manager',
    organization: { id: 'org-123', name: 'Test Organization' },
    expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    status: 'pending',
  };

  it('displays invitation details for valid token', async () => {
    renderApp({
      initialRoute: `/join/${validToken}`,
      mockSupabase: {
        rpc: vi.fn().mockResolvedValue({ data: mockInvitation, error: null }),
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Test Organization/i)).toBeInTheDocument();
      expect(screen.getByText(/event_manager/i)).toBeInTheDocument();
    });
  });

  it('shows error for invalid token', async () => {
    renderApp({
      initialRoute: `/join/invalid-token`,
      mockSupabase: {
        rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'Invalid token' } }),
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/invalid.*invitation/i)).toBeInTheDocument();
    });
  });

  it('shows error for expired invitation', async () => {
    const expiredInvitation = {
      ...mockInvitation,
      expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      status: 'expired',
    };

    renderApp({
      initialRoute: `/join/${validToken}`,
      mockSupabase: {
        rpc: vi.fn().mockResolvedValue({ data: expiredInvitation, error: null }),
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/expired/i)).toBeInTheDocument();
    });
  });

  it('allows new user to sign up and accept invitation', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    const mockAcceptInvitation = vi.fn().mockResolvedValue({
      data: { success: true },
      error: null
    });

    const { user } = renderApp({
      initialRoute: `/join/${validToken}`,
      mockSupabase: {
        rpc: vi.fn()
          .mockResolvedValueOnce({ data: mockInvitation, error: null })
          .mockResolvedValueOnce({ data: { success: true }, error: null }), // accept_invitation
        auth: { signUp: mockSignUp },
      },
    });

    // Fill sign up form
    await user.type(screen.getByLabelText(/email/i), 'invited@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockAcceptInvitation).toHaveBeenCalled();
    });
  });

  it('auto-accepts invitation after signup', async () => {
    // Verify accept_invitation RPC is called after auth completes
  });

  it('redirects to dashboard after accepting', async () => {
    // Verify navigation to / after accept
  });
});
```

**Acceptance criteria:**
- Invitation display tested
- Invalid token error tested
- Expired invitation error tested
- Sign up + accept flow tested
- Redirect after accept tested

---

### Task 6: Test Invitation Flow (Existing User)

**File:** `src/pages/__tests__/invitation-existing-user.test.tsx` (new file)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderApp } from '@/test/integration-utils';

describe('Invitation Flow - Existing User', () => {
  const validToken = 'valid-invitation-token';
  const mockInvitation = {
    id: 'inv-123',
    email: 'existing@example.com',
    role: 'event_manager',
    organization: { id: 'org-456', name: 'New Organization' },
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    status: 'pending',
  };

  it('shows sign in option for existing user', async () => {
    renderApp({
      initialRoute: `/join/${validToken}`,
      mockSupabase: {
        rpc: vi.fn().mockResolvedValue({ data: mockInvitation, error: null }),
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('auto-accepts invitation after signin', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    });
    const mockAcceptInvitation = vi.fn().mockResolvedValue({
      data: { success: true },
      error: null
    });

    const { user } = renderApp({
      initialRoute: `/join/${validToken}`,
      mockSupabase: {
        rpc: vi.fn()
          .mockResolvedValueOnce({ data: mockInvitation, error: null })
          .mockResolvedValueOnce({ data: { success: true }, error: null }),
        auth: { signInWithPassword: mockSignIn },
      },
    });

    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      // Invitation accepted, user added to org
    });
  });

  it('handles already-a-member case gracefully', async () => {
    // User already in org, invitation should show appropriate message
  });
});
```

**Acceptance criteria:**
- Existing user sign in path tested
- Auto-accept after sign in tested
- Edge cases handled

---

### Task 7: Test Sign Out Flow

**File:** `src/pages/__tests__/auth-signout.test.tsx` (new file)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderApp } from '@/test/integration-utils';

describe('Sign Out Flow', () => {
  it('calls Supabase signOut when clicking sign out', async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });

    const { user } = renderApp({
      initialRoute: '/',
      mockAuthState: {
        user: { id: 'user-123' },
        session: { access_token: 'token' },
        currentOrg: { id: 'org-123' },
      },
      mockSupabase: {
        auth: { signOut: mockSignOut },
      },
    });

    // Open user menu
    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('redirects to /auth after sign out', async () => {
    const mockSignOut = vi.fn().mockResolvedValue({ error: null });

    const { user } = renderApp({
      initialRoute: '/',
      mockSupabase: {
        auth: { signOut: mockSignOut },
      },
    });

    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  it('clears local storage on sign out', async () => {
    localStorage.setItem('steady_current_org', 'org-123');

    const mockSignOut = vi.fn().mockResolvedValue({ error: null });

    const { user } = renderApp({
      initialRoute: '/',
      mockSupabase: {
        auth: { signOut: mockSignOut },
      },
    });

    await user.click(screen.getByRole('button', { name: /user menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));

    await waitFor(() => {
      expect(localStorage.getItem('steady_current_org')).toBeNull();
    });
  });
});
```

**Acceptance criteria:**
- Sign out calls Supabase
- Redirect to auth page
- Local storage cleared

---

### Task 8: Test Organization Switching

**File:** `src/components/__tests__/org-switcher.test.tsx` (new file)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderApp } from '@/test/integration-utils';

describe('Organization Switching', () => {
  const orgs = [
    { organization_id: 'org-1', organization: { id: 'org-1', name: 'Org One' } },
    { organization_id: 'org-2', organization: { id: 'org-2', name: 'Org Two' } },
  ];

  it('displays current organization name', async () => {
    renderApp({
      initialRoute: '/',
      mockAuthState: {
        currentOrg: { id: 'org-1', name: 'Org One' },
        organizations: orgs,
      },
    });

    expect(screen.getByText(/Org One/i)).toBeInTheDocument();
  });

  it('shows all organizations in switcher', async () => {
    const { user } = renderApp({
      initialRoute: '/',
      mockAuthState: {
        currentOrg: { id: 'org-1', name: 'Org One' },
        organizations: orgs,
      },
    });

    await user.click(screen.getByRole('button', { name: /switch org/i }));

    expect(screen.getByText(/Org One/i)).toBeInTheDocument();
    expect(screen.getByText(/Org Two/i)).toBeInTheDocument();
  });

  it('switches organization and refreshes data', async () => {
    const switchOrg = vi.fn();

    const { user } = renderApp({
      initialRoute: '/',
      mockAuthState: {
        currentOrg: { id: 'org-1', name: 'Org One' },
        organizations: orgs,
        switchOrganization: switchOrg,
      },
    });

    await user.click(screen.getByRole('button', { name: /switch org/i }));
    await user.click(screen.getByText(/Org Two/i));

    expect(switchOrg).toHaveBeenCalledWith('org-2');
  });

  it('persists selected organization to localStorage', async () => {
    const { user } = renderApp({
      initialRoute: '/',
      mockAuthState: {
        currentOrg: { id: 'org-1', name: 'Org One' },
        organizations: orgs,
      },
    });

    await user.click(screen.getByRole('button', { name: /switch org/i }));
    await user.click(screen.getByText(/Org Two/i));

    expect(localStorage.getItem('steady_current_org')).toBe('org-2');
  });

  it('invalidates queries on org switch', async () => {
    // Verify React Query cache is cleared or invalidated
  });
});
```

**Acceptance criteria:**
- Current org displayed
- Org list rendered
- Switch function called
- LocalStorage updated
- Queries invalidated

---

## Definition of Done

- [ ] Integration test utilities created
- [ ] Sign up flow fully tested
- [ ] Sign in flow fully tested
- [ ] Protected route behavior tested
- [ ] Invitation flow (new user) tested
- [ ] Invitation flow (existing user) tested
- [ ] Sign out flow tested
- [ ] Org switching tested
- [ ] All tests pass
- [ ] PR created

---

## Commands to Run

```bash
# Create branch
git checkout -b test/integration-auth

# Run integration tests
npm test -- src/pages/__tests__/auth
npm test -- src/components/__tests__/ProtectedRoute
npm test -- src/components/__tests__/org-switcher

# Watch mode
npm run test:watch -- --testPathPattern=auth
```

---

## Notes for Claude Code Session

When starting a Claude Code session for this stream:

> "I'm adding integration tests for authentication flows. The branch is `test/integration-auth`. Please read `docs/testing/STREAM-I-integration-auth.md` for the full task list. Start by reading `src/contexts/AuthContext.tsx` and `src/pages/Auth.tsx` to understand the current implementation, then create the integration test utilities before writing individual tests."
