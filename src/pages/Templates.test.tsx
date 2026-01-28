import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentOrg: { id: 'org-123', name: 'Test Org' },
    user: { id: 'user-123', email: 'test@example.com' },
    profile: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
    organizations: [],
    switchOrganization: vi.fn(),
    signOut: vi.fn(),
  }),
}));

import { useTemplates } from '@/hooks/useTemplates';
import Templates from './Templates';

const mockUseTemplates = useTemplates as ReturnType<typeof vi.fn>;

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('Templates Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state', () => {
    mockUseTemplates.mockReturnValue({
      data: [],
      isLoading: true,
    });

    renderWithProviders(<Templates />);

    // Loading spinner should be present
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show empty state when no templates', () => {
    mockUseTemplates.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderWithProviders(<Templates />);

    expect(screen.getByText('No templates yet')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Template')).toBeInTheDocument();
  });

  it('should render templates list', () => {
    mockUseTemplates.mockReturnValue({
      data: [
        {
          id: 'template-1',
          name: 'Golf Tournament',
          description: 'Annual fundraiser',
          current_version: 2,
          milestone_count: 12,
          events_count: 3,
          last_used_at: '2026-01-10T00:00:00Z',
          is_active: true,
        },
        {
          id: 'template-2',
          name: 'Gala Dinner',
          description: 'Formal fundraising event',
          current_version: 1,
          milestone_count: 8,
          events_count: 0,
          last_used_at: null,
          is_active: true,
        },
      ],
      isLoading: false,
    });

    renderWithProviders(<Templates />);

    expect(screen.getByText('Golf Tournament')).toBeInTheDocument();
    expect(screen.getByText('Gala Dinner')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('12 milestones')).toBeInTheDocument();
    expect(screen.getByText('8 milestones')).toBeInTheDocument();
    expect(screen.getByText('Never used')).toBeInTheDocument();
  });

  it('should have create template button', () => {
    mockUseTemplates.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderWithProviders(<Templates />);

    const createButtons = screen.getAllByRole('link', { name: /create/i });
    expect(createButtons.length).toBeGreaterThan(0);
    expect(createButtons[0]).toHaveAttribute('href', '/app/templates/new');
  });
});
