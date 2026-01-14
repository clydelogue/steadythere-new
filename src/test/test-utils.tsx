import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

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

// Custom render that wraps with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const queryClient = createTestQueryClient();
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
    ...options,
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
