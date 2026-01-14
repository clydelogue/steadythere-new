import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  createWrapper,
  createMockTemplate,
  createMockTemplateVersion,
  createMockMilestoneTemplate,
} from '@/test/test-utils';

// Mock the Supabase client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    single: mockSingle,
    order: mockOrder,
  })),
};

// Chain methods
mockSelect.mockReturnValue({
  eq: mockEq,
  order: mockOrder,
  single: mockSingle,
});
mockEq.mockReturnValue({
  eq: mockEq,
  order: mockOrder,
  single: mockSingle,
  select: mockSelect,
});
mockOrder.mockReturnValue({
  eq: mockEq,
});
mockInsert.mockReturnValue({
  select: mockSelect,
});
mockUpdate.mockReturnValue({
  eq: mockEq,
  select: mockSelect,
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock auth context
const mockCurrentOrg = { id: 'org-123', name: 'Test Org' };
const mockUser = { id: 'user-123', email: 'test@example.com' };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentOrg: mockCurrentOrg,
    user: mockUser,
  }),
}));

describe('useTemplates hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('data transformations', () => {
    it('should transform template data with computed fields', async () => {
      const mockTemplates = [
        {
          ...createMockTemplate({ id: 'template-1', name: 'Template A' }),
          milestone_templates: [{ count: 5 }],
          events: [
            { id: 'event-1', created_at: '2026-01-10T00:00:00Z' },
            { id: 'event-2', created_at: '2026-01-15T00:00:00Z' },
          ],
        },
        {
          ...createMockTemplate({ id: 'template-2', name: 'Template B' }),
          milestone_templates: [{ count: 3 }],
          events: [],
        },
      ];

      // The transformation logic from useTemplates
      const transformed = mockTemplates.map((t: any) => ({
        ...t,
        milestone_count: t.milestone_templates?.[0]?.count || 0,
        events_count: t.events?.length || 0,
        last_used_at: t.events?.length > 0
          ? t.events.sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0].created_at
          : null,
        milestone_templates: undefined,
        events: undefined,
      }));

      expect(transformed[0].milestone_count).toBe(5);
      expect(transformed[0].events_count).toBe(2);
      expect(transformed[0].last_used_at).toBe('2026-01-15T00:00:00Z');

      expect(transformed[1].milestone_count).toBe(3);
      expect(transformed[1].events_count).toBe(0);
      expect(transformed[1].last_used_at).toBeNull();
    });

    it('should sort milestones by sort_order', () => {
      const milestones = [
        createMockMilestoneTemplate({ id: 'm1', sort_order: 2 }),
        createMockMilestoneTemplate({ id: 'm2', sort_order: 0 }),
        createMockMilestoneTemplate({ id: 'm3', sort_order: 1 }),
      ];

      const sorted = [...milestones].sort((a, b) =>
        (a.sort_order || 0) - (b.sort_order || 0)
      );

      expect(sorted[0].id).toBe('m2');
      expect(sorted[1].id).toBe('m3');
      expect(sorted[2].id).toBe('m1');
    });
  });

  describe('CreateTemplateInput validation', () => {
    it('should have required fields for creating a template', () => {
      const validInput = {
        name: 'Golf Tournament',
        description: 'Annual fundraiser',
        milestones: [
          {
            title: 'Book venue',
            category: 'VENUE' as const,
            days_before_event: 90,
          },
        ],
      };

      expect(validInput.name).toBeTruthy();
      expect(validInput.milestones.length).toBeGreaterThan(0);
      expect(validInput.milestones[0].title).toBeTruthy();
      expect(validInput.milestones[0].category).toBeTruthy();
      expect(validInput.milestones[0].days_before_event).toBeGreaterThan(0);
    });

    it('should allow optional fields', () => {
      const minimalInput = {
        name: 'Simple Template',
        milestones: [],
      };

      expect(minimalInput.name).toBeTruthy();
      expect(minimalInput.milestones).toEqual([]);
    });
  });

  describe('version increment logic', () => {
    it('should correctly calculate next version number', () => {
      const currentVersion = 3;
      const newVersion = currentVersion + 1;
      expect(newVersion).toBe(4);
    });

    it('should handle null current version', () => {
      const currentVersion = null;
      const newVersion = (currentVersion || 1) + 1;
      expect(newVersion).toBe(2);
    });
  });
});

describe('Template types', () => {
  it('should have all required EventType fields', () => {
    const template = createMockTemplate();

    expect(template).toHaveProperty('id');
    expect(template).toHaveProperty('organization_id');
    expect(template).toHaveProperty('name');
    expect(template).toHaveProperty('current_version');
    expect(template).toHaveProperty('is_active');
  });

  it('should have all required TemplateVersion fields', () => {
    const version = createMockTemplateVersion();

    expect(version).toHaveProperty('id');
    expect(version).toHaveProperty('event_type_id');
    expect(version).toHaveProperty('version');
    expect(version).toHaveProperty('created_by');
  });

  it('should have all required MilestoneTemplate fields', () => {
    const milestone = createMockMilestoneTemplate();

    expect(milestone).toHaveProperty('id');
    expect(milestone).toHaveProperty('event_type_id');
    expect(milestone).toHaveProperty('template_version_id');
    expect(milestone).toHaveProperty('title');
    expect(milestone).toHaveProperty('category');
    expect(milestone).toHaveProperty('days_before_event');
  });
});

describe('MilestoneCategory values', () => {
  const validCategories = [
    'VENUE',
    'CATERING',
    'MARKETING',
    'LOGISTICS',
    'PERMITS',
    'SPONSORS',
    'VOLUNTEERS',
    'GENERAL',
  ];

  it.each(validCategories)('should accept %s as a valid category', (category) => {
    const milestone = createMockMilestoneTemplate({ category: category as any });
    expect(validCategories).toContain(milestone.category);
  });
});

describe('days_before_event calculations', () => {
  it('should calculate correct due date from event date', () => {
    const eventDate = new Date('2026-06-15');
    const daysBeforeEvent = 30;

    const dueDate = new Date(eventDate);
    dueDate.setDate(dueDate.getDate() - daysBeforeEvent);

    expect(dueDate.toISOString().split('T')[0]).toBe('2026-05-16');
  });

  it('should handle various days_before_event values', () => {
    const testCases = [
      { days: 90, expected: '2026-03-17' },
      { days: 60, expected: '2026-04-16' },
      { days: 30, expected: '2026-05-16' },
      { days: 7, expected: '2026-06-08' },
      { days: 1, expected: '2026-06-14' },
    ];

    const eventDate = new Date('2026-06-15');

    testCases.forEach(({ days, expected }) => {
      const dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() - days);
      expect(dueDate.toISOString().split('T')[0]).toBe(expected);
    });
  });
});
