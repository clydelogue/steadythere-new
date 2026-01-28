import React, { ReactElement, createContext, useContext } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, Organization, OrganizationMember, OrgRole } from '@/types/database';
import type { Permission } from '@/lib/permissions';
import { hasPermission, hasAnyPermission, canManageTeam, canManageOrg, canManageEvents, isAdminRole } from '@/lib/permissions';

// Create a fresh query client for each test
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: React.ReactNode;
}

export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// Mock Auth State Types
export interface MockAuthState {
  user?: User | null;
  session?: Session | null;
  profile?: Profile | null;
  currentOrg?: Organization | null;
  currentOrgMember?: OrganizationMember | null;
  currentRole?: OrgRole | null;
  organizations?: OrganizationMember[];
  isLoading?: boolean;
  orgsLoaded?: boolean;
}

// Mock Auth Context Type (mirrors the real AuthContextType)
export interface MockAuthContextType extends MockAuthState {
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  canManageTeam: boolean;
  canManageOrg: boolean;
  canManageEvents: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ data: { user: User | null; session: Session | null }; error: Error | null }>;
  signOut: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  refreshProfile: () => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

// Create a test-only Auth Context
const TestAuthContext = createContext<MockAuthContextType | undefined>(undefined);

export function useTestAuth() {
  const context = useContext(TestAuthContext);
  if (context === undefined) {
    throw new Error('useTestAuth must be used within a TestAuthProvider');
  }
  return context;
}

// Create mock auth context with sensible defaults
export function createMockAuthContext(overrides?: Partial<MockAuthState>): MockAuthContextType {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: { name: 'Test User' },
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  } as User;

  const mockSession: Session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  } as Session;

  const mockProfile: Profile = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: null,
    timezone: 'America/New_York',
    quiet_hours_start: null,
    quiet_hours_end: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockOrg: Organization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    timezone: 'America/New_York',
    default_reminder_days: [7, 3, 1],
    digest_enabled: true,
    digest_day: 1,
    digest_time: '09:00',
    inbound_email_address: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockOrgMember: OrganizationMember = {
    id: 'member-123',
    organization_id: 'org-123',
    user_id: 'user-123',
    role: 'org_admin',
    created_at: '2026-01-01T00:00:00Z',
    organization: mockOrg,
    profile: mockProfile,
  };

  const state: MockAuthState = {
    user: mockUser,
    session: mockSession,
    profile: mockProfile,
    currentOrg: mockOrg,
    currentOrgMember: mockOrgMember,
    currentRole: 'org_admin',
    organizations: [mockOrgMember],
    isLoading: false,
    orgsLoaded: true,
    ...overrides,
  };

  const role = state.currentRole ?? null;

  return {
    ...state,
    user: state.user ?? null,
    session: state.session ?? null,
    profile: state.profile ?? null,
    currentOrg: state.currentOrg ?? null,
    currentOrgMember: state.currentOrgMember ?? null,
    currentRole: state.currentRole ?? null,
    organizations: state.organizations ?? [],
    isLoading: state.isLoading ?? false,
    orgsLoaded: state.orgsLoaded ?? true,
    // Permission helpers
    hasPermission: (permission: Permission) => hasPermission(role, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    canManageTeam: canManageTeam(role),
    canManageOrg: canManageOrg(role),
    canManageEvents: canManageEvents(role),
    isAdmin: isAdminRole(role),
    // Auth methods (mocked)
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: state.user, session: state.session }, error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    switchOrganization: vi.fn(),
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    refreshOrganizations: vi.fn().mockResolvedValue(undefined),
  };
}

// Auth Test Wrapper component
export function AuthTestWrapper({
  children,
  authState,
}: {
  children: React.ReactNode;
  authState?: Partial<MockAuthState>;
}) {
  const mockAuth = createMockAuthContext(authState);
  return (
    <TestAuthContext.Provider value={mockAuth}>
      {children}
    </TestAuthContext.Provider>
  );
}

// Render options with auth and routing support
export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  authState?: Partial<MockAuthState>;
  queryClient?: QueryClient;
  route?: string;
}

// Custom render that wraps with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
) {
  const { authState, queryClient: providedQueryClient, route = '/', ...renderOptions } = options || {};
  const queryClient = providedQueryClient ?? createTestQueryClient();
  const mockAuth = createMockAuthContext(authState);

  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <TestAuthContext.Provider value={mockAuth}>
            {children}
          </TestAuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>
    ),
    ...renderOptions,
  });
}

// Convenience wrapper for rendering without auth context (simpler testing)
export function renderWithQueryClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }
) {
  const { queryClient: providedQueryClient, ...renderOptions } = options || {};
  const queryClient = providedQueryClient ?? createTestQueryClient();
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
    ...renderOptions,
  });
}

// Mock Supabase client
export const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  auth: {
    getSession: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
};

// Reset all mocks between tests
export function resetMocks() {
  vi.clearAllMocks();
}

// Mock data factories
export const createMockOrganization = (overrides = {}) => ({
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
  timezone: 'America/New_York',
  default_reminder_days: [7, 3, 1],
  digest_enabled: true,
  digest_day: 1,
  digest_time: '09:00',
  inbound_email_address: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  timezone: 'America/New_York',
  quiet_hours_start: null,
  quiet_hours_end: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const createMockTemplate = (overrides = {}) => ({
  id: 'template-123',
  organization_id: 'org-123',
  name: 'Test Template',
  description: 'A test template',
  icon: 'calendar',
  default_reminder_days: [7, 3, 1],
  current_version: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const createMockTemplateVersion = (overrides = {}) => ({
  id: 'version-123',
  event_type_id: 'template-123',
  version: 1,
  changelog: 'Initial version',
  created_by: 'user-123',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const createMockMilestoneTemplate = (overrides = {}) => ({
  id: 'milestone-template-123',
  event_type_id: 'template-123',
  template_version_id: 'version-123',
  title: 'Test Milestone',
  description: 'A test milestone',
  category: 'GENERAL' as const,
  days_before_event: 30,
  estimated_hours: 2,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const createMockEvent = (overrides = {}) => ({
  id: 'event-123',
  organization_id: 'org-123',
  event_type_id: 'template-123',
  template_version_id: 'version-123',
  name: 'Test Event',
  description: 'A test event',
  event_date: '2026-06-01',
  event_end_date: null,
  venue: 'Test Venue',
  address: '123 Test St',
  is_virtual: false,
  virtual_link: null,
  reminder_days: [7, 3, 1],
  status: 'PLANNING' as const,
  owner_id: 'user-123',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const createMockMilestone = (overrides = {}) => ({
  id: 'milestone-123',
  event_id: 'event-123',
  title: 'Test Milestone',
  description: 'A test milestone',
  category: 'GENERAL' as const,
  due_date: '2026-05-01',
  completed_at: null,
  status: 'NOT_STARTED' as const,
  estimated_hours: 2,
  actual_hours: null,
  assignee_id: null,
  from_template_id: 'milestone-template-123',
  is_ai_generated: false,
  was_modified: false,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const createMockProfile = (overrides: Partial<{
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  timezone: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}> = {}) => ({
  id: 'profile-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  timezone: 'America/New_York',
  quiet_hours_start: null,
  quiet_hours_end: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const createMockOrganizationMember = (overrides: Partial<{
  id: string;
  organization_id: string;
  user_id: string;
  role: 'org_admin' | 'event_manager' | 'vendor' | 'partner' | 'volunteer';
  created_at: string;
  organization: ReturnType<typeof createMockOrganization>;
  profile: ReturnType<typeof createMockProfile>;
}> = {}) => ({
  id: 'member-123',
  organization_id: 'org-123',
  user_id: 'user-123',
  role: 'org_admin' as const,
  created_at: '2026-01-01T00:00:00Z',
  organization: createMockOrganization(),
  profile: createMockProfile(),
  ...overrides,
});

export const createMockInvitation = (overrides: Partial<{
  id: string;
  organization_id: string;
  event_id: string | null;
  email: string;
  role: 'org_admin' | 'event_manager' | 'vendor' | 'partner' | 'volunteer';
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by: string;
  message: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  updated_at: string;
  organization: ReturnType<typeof createMockOrganization>;
  event: ReturnType<typeof createMockEvent> | null;
  inviter: ReturnType<typeof createMockProfile>;
}> = {}) => ({
  id: 'invitation-123',
  organization_id: 'org-123',
  event_id: null,
  email: 'invitee@example.com',
  role: 'event_manager' as const,
  token: 'test-token-abc123',
  status: 'pending' as const,
  invited_by: 'user-123',
  message: null,
  expires_at: '2026-02-01T00:00:00Z',
  accepted_at: null,
  accepted_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const createMockNotification = (overrides: Partial<{
  id: string;
  organization_id: string;
  user_id: string;
  type: 'REMINDER' | 'OVERDUE' | 'ESCALATION' | 'ASSIGNMENT' | 'DIGEST' | 'WELCOME' | 'EVENT_UPDATE';
  title: string;
  body: string | null;
  action_url: string | null;
  channel: 'EMAIL' | 'SMS' | 'IN_APP';
  scheduled_for: string;
  sent_at: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  related_event_id: string | null;
  related_milestone_id: string | null;
  created_at: string;
}> = {}) => ({
  id: 'notification-123',
  organization_id: 'org-123',
  user_id: 'user-123',
  type: 'REMINDER' as const,
  title: 'Test Notification',
  body: 'This is a test notification body',
  action_url: null,
  channel: 'EMAIL' as const,
  scheduled_for: '2026-01-15T09:00:00Z',
  sent_at: null,
  status: 'PENDING' as const,
  related_event_id: null,
  related_milestone_id: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const createMockDocument = (overrides: Partial<{
  id: string;
  organization_id: string;
  event_id: string | null;
  milestone_id: string | null;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  category: 'CONTRACT' | 'INVOICE' | 'PERMIT' | 'MARKETING' | 'PHOTO' | 'REPORT' | 'CORRESPONDENCE' | 'UNCATEGORIZED';
  source: 'UPLOAD' | 'EMAIL' | 'GENERATED';
  source_email_from: string | null;
  source_email_subject: string | null;
  uploaded_by: string | null;
  created_at: string;
}> = {}) => ({
  id: 'document-123',
  organization_id: 'org-123',
  event_id: 'event-123',
  milestone_id: null,
  filename: 'test-document.pdf',
  mime_type: 'application/pdf',
  size_bytes: 1024,
  storage_path: 'org-123/documents/test-document.pdf',
  category: 'CONTRACT' as const,
  source: 'UPLOAD' as const,
  source_email_from: null,
  source_email_subject: null,
  uploaded_by: 'user-123',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});
