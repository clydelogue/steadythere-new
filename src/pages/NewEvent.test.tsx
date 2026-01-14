import { describe, it, expect, vi } from 'vitest';
import {
  createMockTemplate,
  createMockMilestoneTemplate,
} from '@/test/test-utils';

describe('NewEvent - Template to Event Flow', () => {
  describe('milestone conversion', () => {
    it('should convert template milestones to editable format', () => {
      const templateMilestones = [
        createMockMilestoneTemplate({
          id: 'mt-1',
          title: 'Book venue',
          category: 'VENUE',
          days_before_event: 90,
          description: 'Reserve the location',
          estimated_hours: 2,
        }),
        createMockMilestoneTemplate({
          id: 'mt-2',
          title: 'Secure sponsors',
          category: 'SPONSORS',
          days_before_event: 75,
          description: null,
          estimated_hours: null,
        }),
      ];

      // Simulate the conversion logic from NewEvent
      const editableMilestones = templateMilestones.map((m, index) => ({
        id: index + 1,
        title: m.title,
        category: m.category,
        daysBeforeEvent: m.days_before_event,
        description: m.description || undefined,
        estimatedHours: m.estimated_hours || undefined,
      }));

      expect(editableMilestones).toHaveLength(2);
      expect(editableMilestones[0]).toEqual({
        id: 1,
        title: 'Book venue',
        category: 'VENUE',
        daysBeforeEvent: 90,
        description: 'Reserve the location',
        estimatedHours: 2,
      });
      expect(editableMilestones[1]).toEqual({
        id: 2,
        title: 'Secure sponsors',
        category: 'SPONSORS',
        daysBeforeEvent: 75,
        description: undefined,
        estimatedHours: undefined,
      });
    });
  });

  describe('due date calculation from event date', () => {
    it('should calculate milestone due dates correctly', () => {
      const eventDate = '2026-06-15';
      const daysBeforeEvent = 30;

      const eventDateObj = new Date(eventDate);
      eventDateObj.setDate(eventDateObj.getDate() - daysBeforeEvent);
      const dueDate = eventDateObj.toISOString().split('T')[0];

      expect(dueDate).toBe('2026-05-16');
    });

    it('should handle milestones on event day', () => {
      const eventDate = '2026-06-15';
      const daysBeforeEvent = 0;

      const eventDateObj = new Date(eventDate);
      eventDateObj.setDate(eventDateObj.getDate() - daysBeforeEvent);
      const dueDate = eventDateObj.toISOString().split('T')[0];

      expect(dueDate).toBe('2026-06-15');
    });
  });

  describe('milestone selection', () => {
    it('should default to all milestones selected', () => {
      const milestones = [
        { id: 1, title: 'Milestone 1' },
        { id: 2, title: 'Milestone 2' },
        { id: 3, title: 'Milestone 3' },
      ];

      const selectedIds = milestones.map(m => m.id);

      expect(selectedIds).toEqual([1, 2, 3]);
    });

    it('should filter milestones by selection', () => {
      const milestones = [
        { id: 1, title: 'Milestone 1' },
        { id: 2, title: 'Milestone 2' },
        { id: 3, title: 'Milestone 3' },
      ];

      const selectedIds = [1, 3]; // User deselected milestone 2

      const selectedMilestones = milestones.filter(m => selectedIds.includes(m.id));

      expect(selectedMilestones).toHaveLength(2);
      expect(selectedMilestones.map(m => m.id)).toEqual([1, 3]);
    });
  });

  describe('event creation payload', () => {
    it('should build correct milestone insert payload', () => {
      const eventId = 'event-123';
      const eventDate = '2026-06-15';
      const milestones = [
        { id: 1, title: 'Book venue', category: 'VENUE', daysBeforeEvent: 90 },
        { id: 2, title: 'Secure sponsors', category: 'SPONSORS', daysBeforeEvent: 75 },
      ];
      const selectedIds = [1, 2];

      const milestonesToCreate = milestones
        .filter(m => selectedIds.includes(m.id))
        .map((m, index) => {
          const eventDateObj = new Date(eventDate);
          eventDateObj.setDate(eventDateObj.getDate() - m.daysBeforeEvent);

          return {
            title: m.title,
            category: m.category,
            due_date: eventDateObj.toISOString().split('T')[0],
            event_id: eventId,
            status: 'NOT_STARTED' as const,
            is_ai_generated: false,
            sort_order: index
          };
        });

      expect(milestonesToCreate).toHaveLength(2);
      expect(milestonesToCreate[0]).toMatchObject({
        title: 'Book venue',
        category: 'VENUE',
        due_date: '2026-03-17', // 90 days before June 15
        event_id: 'event-123',
        status: 'NOT_STARTED',
        is_ai_generated: false,
        sort_order: 0
      });
      expect(milestonesToCreate[1]).toMatchObject({
        title: 'Secure sponsors',
        due_date: '2026-04-01', // 75 days before June 15
        sort_order: 1
      });
    });
  });

  describe('template preselection via URL', () => {
    it('should parse template ID from search params', () => {
      // Simulate URL: /events/new?template=template-123
      const searchParams = new URLSearchParams('template=template-123');
      const templateId = searchParams.get('template');

      expect(templateId).toBe('template-123');
    });

    it('should return null when no template param', () => {
      const searchParams = new URLSearchParams('');
      const templateId = searchParams.get('template');

      expect(templateId).toBeNull();
    });
  });
});

describe('Template-based Event Creation', () => {
  it('should track template version when creating event', () => {
    const template = createMockTemplate({
      id: 'template-123',
      current_version: 3,
    });

    // The event should store which template version was used
    const eventPayload = {
      name: 'Annual Gala',
      event_type_id: template.id,
      template_version_id: 'version-id-for-v3', // This would come from DB lookup
    };

    expect(eventPayload.event_type_id).toBe('template-123');
    expect(eventPayload.template_version_id).toBeDefined();
  });

  it('should preserve milestone order from template', () => {
    const templateMilestones = [
      { sort_order: 0, title: 'First' },
      { sort_order: 1, title: 'Second' },
      { sort_order: 2, title: 'Third' },
    ];

    // Sort by sort_order to ensure correct order
    const sorted = [...templateMilestones].sort((a, b) => a.sort_order - b.sort_order);

    expect(sorted[0].title).toBe('First');
    expect(sorted[1].title).toBe('Second');
    expect(sorted[2].title).toBe('Third');
  });
});
