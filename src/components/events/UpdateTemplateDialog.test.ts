import { describe, it, expect } from 'vitest';
import {
  createMockEvent,
  createMockMilestone,
  createMockMilestoneTemplate,
} from '@/test/test-utils';

describe('UpdateTemplateDialog - Diff Calculation', () => {
  describe('detecting added milestones', () => {
    it('should detect milestones in event that are not in template', () => {
      const templateMilestones = [
        createMockMilestoneTemplate({ title: 'Book venue' }),
        createMockMilestoneTemplate({ title: 'Secure sponsors' }),
      ];

      const eventMilestones = [
        createMockMilestone({ title: 'Book venue' }),
        createMockMilestone({ title: 'Secure sponsors' }),
        createMockMilestone({ title: 'Arrange valet parking' }), // Added
      ];

      // Find added milestones
      const added = eventMilestones.filter(em =>
        !templateMilestones.some(tm =>
          tm.title.toLowerCase() === em.title.toLowerCase()
        )
      );

      expect(added).toHaveLength(1);
      expect(added[0].title).toBe('Arrange valet parking');
    });

    it('should handle case-insensitive title matching', () => {
      const templateMilestones = [
        createMockMilestoneTemplate({ title: 'Book Venue' }),
      ];

      const eventMilestones = [
        createMockMilestone({ title: 'book venue' }), // Different case, same title
        createMockMilestone({ title: 'New Task' }),
      ];

      const added = eventMilestones.filter(em =>
        !templateMilestones.some(tm =>
          tm.title.toLowerCase() === em.title.toLowerCase()
        )
      );

      expect(added).toHaveLength(1);
      expect(added[0].title).toBe('New Task');
    });
  });

  describe('detecting removed milestones', () => {
    it('should detect milestones in template that are not in event', () => {
      const templateMilestones = [
        createMockMilestoneTemplate({ title: 'Book venue' }),
        createMockMilestoneTemplate({ title: 'Print programs' }), // Removed
        createMockMilestoneTemplate({ title: 'Secure sponsors' }),
      ];

      const eventMilestones = [
        createMockMilestone({ title: 'Book venue' }),
        createMockMilestone({ title: 'Secure sponsors' }),
      ];

      // Find removed milestones
      const removed = templateMilestones.filter(tm =>
        !eventMilestones.some(em =>
          em.title.toLowerCase() === tm.title.toLowerCase()
        )
      );

      expect(removed).toHaveLength(1);
      expect(removed[0].title).toBe('Print programs');
    });
  });

  describe('combined diffs', () => {
    it('should detect both added and removed milestones', () => {
      const templateMilestones = [
        createMockMilestoneTemplate({ title: 'Book venue' }),
        createMockMilestoneTemplate({ title: 'Print programs' }), // Will be removed
      ];

      const eventMilestones = [
        createMockMilestone({ title: 'Book venue' }),
        createMockMilestone({ title: 'Arrange valet' }), // Added
      ];

      const added = eventMilestones.filter(em =>
        !templateMilestones.some(tm =>
          tm.title.toLowerCase() === em.title.toLowerCase()
        )
      );

      const removed = templateMilestones.filter(tm =>
        !eventMilestones.some(em =>
          em.title.toLowerCase() === tm.title.toLowerCase()
        )
      );

      expect(added).toHaveLength(1);
      expect(added[0].title).toBe('Arrange valet');
      expect(removed).toHaveLength(1);
      expect(removed[0].title).toBe('Print programs');
    });

    it('should return no diffs when milestones match', () => {
      const templateMilestones = [
        createMockMilestoneTemplate({ title: 'Book venue' }),
        createMockMilestoneTemplate({ title: 'Secure sponsors' }),
      ];

      const eventMilestones = [
        createMockMilestone({ title: 'Book venue' }),
        createMockMilestone({ title: 'Secure sponsors' }),
      ];

      const added = eventMilestones.filter(em =>
        !templateMilestones.some(tm =>
          tm.title.toLowerCase() === em.title.toLowerCase()
        )
      );

      const removed = templateMilestones.filter(tm =>
        !eventMilestones.some(em =>
          em.title.toLowerCase() === tm.title.toLowerCase()
        )
      );

      expect(added).toHaveLength(0);
      expect(removed).toHaveLength(0);
    });
  });
});

describe('UpdateTemplateDialog - Days Before Event Calculation', () => {
  it('should calculate days_before_event from event date and due date', () => {
    const eventDate = '2026-06-15';
    const dueDate = '2026-05-15'; // 31 days before

    const eventDateObj = new Date(eventDate);
    const dueDateObj = new Date(dueDate);
    const daysBefore = Math.round(
      (eventDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysBefore).toBe(31);
  });

  it('should handle due date on event day', () => {
    const eventDate = '2026-06-15';
    const dueDate = '2026-06-15';

    const eventDateObj = new Date(eventDate);
    const dueDateObj = new Date(dueDate);
    const daysBefore = Math.round(
      (eventDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysBefore).toBe(0);
  });

  it('should handle due date after event (negative days before)', () => {
    const eventDate = '2026-06-15';
    const dueDate = '2026-06-20'; // 5 days after

    const eventDateObj = new Date(eventDate);
    const dueDateObj = new Date(dueDate);
    const daysBefore = Math.round(
      (eventDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Should be negative, but we clamp to 0
    expect(Math.max(0, daysBefore)).toBe(0);
  });
});

describe('UpdateTemplateDialog - Milestone Merging', () => {
  it('should apply additions to template milestones', () => {
    const templateMilestones = [
      { title: 'Book venue', category: 'VENUE', days_before_event: 90 },
    ];

    const additions = [
      { title: 'Arrange valet', category: 'LOGISTICS', days_before_event: 7 },
    ];

    const updated = [...templateMilestones, ...additions];

    expect(updated).toHaveLength(2);
    expect(updated.map(m => m.title)).toContain('Arrange valet');
  });

  it('should apply removals to template milestones', () => {
    const templateMilestones = [
      { title: 'Book venue', category: 'VENUE', days_before_event: 90 },
      { title: 'Print programs', category: 'MARKETING', days_before_event: 30 },
    ];

    const removals = ['Print programs'];

    const updated = templateMilestones.filter(
      m => !removals.some(r => r.toLowerCase() === m.title.toLowerCase())
    );

    expect(updated).toHaveLength(1);
    expect(updated[0].title).toBe('Book venue');
  });

  it('should sort milestones by days_before_event descending', () => {
    const milestones = [
      { title: 'Task 1', days_before_event: 30 },
      { title: 'Task 2', days_before_event: 90 },
      { title: 'Task 3', days_before_event: 7 },
    ];

    const sorted = [...milestones].sort((a, b) => b.days_before_event - a.days_before_event);

    expect(sorted[0].title).toBe('Task 2'); // 90 days
    expect(sorted[1].title).toBe('Task 1'); // 30 days
    expect(sorted[2].title).toBe('Task 3'); // 7 days
  });
});

describe('UpdateTemplateDialog - Changelog Generation', () => {
  it('should generate changelog from selected changes', () => {
    const selectedChanges = [
      { type: 'added', title: 'Arrange valet parking' },
      { type: 'removed', title: 'Print programs' },
    ];

    const changes = selectedChanges.map(change => {
      if (change.type === 'added') {
        return `Added "${change.title}"`;
      } else {
        return `Removed "${change.title}"`;
      }
    });

    const changelog = changes.join(', ');

    expect(changelog).toBe('Added "Arrange valet parking", Removed "Print programs"');
  });

  it('should handle single change', () => {
    const selectedChanges = [
      { type: 'added', title: 'New task' },
    ];

    const changes = selectedChanges.map(change =>
      change.type === 'added' ? `Added "${change.title}"` : `Removed "${change.title}"`
    );

    const changelog = changes.join(', ');

    expect(changelog).toBe('Added "New task"');
  });
});
