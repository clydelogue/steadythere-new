import { describe, it, expect } from 'vitest';

/**
 * Tests for date calculation logic used throughout the application.
 * These calculations are used inline in various components for:
 * - Converting days_before_event to actual due dates
 * - Calculating days between dates
 * - Determining milestone status (overdue, due soon, etc.)
 */

// Helper functions that mirror the inline logic used in the app
function calculateDueDate(eventDate: Date, daysBeforeEvent: number): string {
  const dueDate = new Date(eventDate);
  dueDate.setDate(dueDate.getDate() - daysBeforeEvent);
  return dueDate.toISOString().split('T')[0];
}

function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isOverdue(dueDate: Date, currentDate: Date, status: string): boolean {
  return dueDate < currentDate && !['COMPLETED', 'SKIPPED'].includes(status);
}

function isDueSoon(dueDate: Date, currentDate: Date, daysThreshold: number = 7): boolean {
  const diffDays = calculateDaysBetween(currentDate, dueDate);
  return diffDays > 0 && diffDays <= daysThreshold;
}

function isDueToday(dueDate: Date, currentDate: Date): boolean {
  return dueDate.toISOString().split('T')[0] === currentDate.toISOString().split('T')[0];
}

describe('date calculations', () => {
  describe('days_before_event to due_date', () => {
    it('calculates correct due date for 30 days before', () => {
      const eventDate = new Date('2026-06-15');
      const daysBeforeEvent = 30;
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2026-05-16');
    });

    it('calculates correct due date for 90 days before', () => {
      const eventDate = new Date('2026-06-15');
      const daysBeforeEvent = 90;
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2026-03-17');
    });

    it('handles month boundaries', () => {
      const eventDate = new Date('2026-03-05');
      const daysBeforeEvent = 10;
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2026-02-23');
    });

    it('handles year boundaries', () => {
      const eventDate = new Date('2026-01-10');
      const daysBeforeEvent = 20;
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2025-12-21');
    });

    it('handles leap year', () => {
      const eventDate = new Date('2028-03-01'); // 2028 is leap year
      const daysBeforeEvent = 1;
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2028-02-29');
    });

    it('handles non-leap year February', () => {
      const eventDate = new Date('2026-03-01'); // 2026 is not a leap year
      const daysBeforeEvent = 1;
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2026-02-28');
    });

    it('handles 0 days before (due on event day)', () => {
      const eventDate = new Date('2026-06-15');
      const daysBeforeEvent = 0;
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2026-06-15');
    });

    it('handles negative days (due after event - edge case)', () => {
      const eventDate = new Date('2026-06-15');
      const daysBeforeEvent = -5;
      // This would be 5 days after the event
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2026-06-20');
    });

    it('handles large number of days before', () => {
      const eventDate = new Date('2026-12-31');
      const daysBeforeEvent = 365;
      // 365 days before Dec 31, 2026 is Dec 31, 2025 (2026 is not a leap year)
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2025-12-31');
    });

    it('handles December to November boundary', () => {
      const eventDate = new Date('2026-12-05');
      const daysBeforeEvent = 15;
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2026-11-20');
    });

    it('handles end of month to start of month', () => {
      const eventDate = new Date('2026-05-01');
      const daysBeforeEvent = 1;
      expect(calculateDueDate(eventDate, daysBeforeEvent)).toBe('2026-04-30');
    });
  });

  describe('due_date to days_before_event (reverse)', () => {
    it('calculates days between dates', () => {
      const eventDate = new Date('2026-06-15');
      const dueDate = new Date('2026-05-16');
      expect(calculateDaysBetween(dueDate, eventDate)).toBe(30);
    });

    it('handles same day', () => {
      const eventDate = new Date('2026-06-15');
      const dueDate = new Date('2026-06-15');
      expect(calculateDaysBetween(dueDate, eventDate)).toBe(0);
    });

    it('handles dates across year boundary', () => {
      const eventDate = new Date('2026-01-10');
      const dueDate = new Date('2025-12-21');
      expect(calculateDaysBetween(dueDate, eventDate)).toBe(20);
    });

    it('handles dates across leap year February', () => {
      const eventDate = new Date('2028-03-01');
      const dueDate = new Date('2028-02-01');
      expect(calculateDaysBetween(dueDate, eventDate)).toBe(29); // 2028 is leap year
    });
  });

  describe('milestone status helpers', () => {
    describe('isOverdue', () => {
      it('identifies overdue milestones', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-10');
        const status = 'NOT_STARTED';
        expect(isOverdue(dueDate, now, status)).toBe(true);
      });

      it('identifies IN_PROGRESS as overdue when past due', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-10');
        const status = 'IN_PROGRESS';
        expect(isOverdue(dueDate, now, status)).toBe(true);
      });

      it('identifies BLOCKED as overdue when past due', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-10');
        const status = 'BLOCKED';
        expect(isOverdue(dueDate, now, status)).toBe(true);
      });

      it('does not mark COMPLETED as overdue', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-10');
        const status = 'COMPLETED';
        expect(isOverdue(dueDate, now, status)).toBe(false);
      });

      it('does not mark SKIPPED as overdue', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-10');
        const status = 'SKIPPED';
        expect(isOverdue(dueDate, now, status)).toBe(false);
      });

      it('does not mark future due date as overdue', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-20');
        const status = 'NOT_STARTED';
        expect(isOverdue(dueDate, now, status)).toBe(false);
      });

      it('handles due date same as current date', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-15');
        const status = 'NOT_STARTED';
        // Same day means not overdue (yet)
        expect(isOverdue(dueDate, now, status)).toBe(false);
      });
    });

    describe('isDueSoon', () => {
      it('identifies upcoming milestones (due within 7 days)', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-20');
        expect(isDueSoon(dueDate, now, 7)).toBe(true);
      });

      it('identifies milestone due in exactly 7 days', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-22');
        expect(isDueSoon(dueDate, now, 7)).toBe(true);
      });

      it('does not mark milestone due in 8+ days as due soon', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-25');
        expect(isDueSoon(dueDate, now, 7)).toBe(false);
      });

      it('does not mark overdue milestones as due soon', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-10');
        expect(isDueSoon(dueDate, now, 7)).toBe(false);
      });

      it('does not mark same-day milestones as due soon (use isDueToday)', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-15');
        // Same day has diffDays of 0, so not > 0
        expect(isDueSoon(dueDate, now, 7)).toBe(false);
      });

      it('respects custom threshold', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-18'); // 3 days away
        expect(isDueSoon(dueDate, now, 3)).toBe(true);
        expect(isDueSoon(dueDate, now, 2)).toBe(false);
      });
    });

    describe('isDueToday', () => {
      it('identifies milestone due today', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-15');
        expect(isDueToday(dueDate, now)).toBe(true);
      });

      it('handles different times on same day', () => {
        const now = new Date('2026-01-15T09:30:00');
        const dueDate = new Date('2026-01-15T17:00:00');
        expect(isDueToday(dueDate, now)).toBe(true);
      });

      it('does not mark different day as due today', () => {
        const now = new Date('2026-01-15');
        const dueDate = new Date('2026-01-16');
        expect(isDueToday(dueDate, now)).toBe(false);
      });
    });
  });
});

describe('date edge cases', () => {
  describe('timezone considerations', () => {
    it('date comparisons use ISO date strings (timezone neutral)', () => {
      // When using toISOString().split('T')[0], we get the UTC date
      // This is consistent regardless of local timezone
      const date = new Date('2026-06-15T00:00:00Z');
      expect(date.toISOString().split('T')[0]).toBe('2026-06-15');
    });
  });

  describe('date construction', () => {
    it('new Date from YYYY-MM-DD string parses correctly', () => {
      const date = new Date('2026-06-15');
      // Note: This parses as midnight UTC
      expect(date.toISOString().split('T')[0]).toBe('2026-06-15');
    });

    it('date arithmetic handles month lengths correctly', () => {
      // 31-day month
      const jan31 = new Date('2026-01-31');
      jan31.setDate(jan31.getDate() + 1);
      expect(jan31.toISOString().split('T')[0]).toBe('2026-02-01');

      // 28-day month (non-leap year)
      const feb28 = new Date('2026-02-28');
      feb28.setDate(feb28.getDate() + 1);
      expect(feb28.toISOString().split('T')[0]).toBe('2026-03-01');

      // 29-day month (leap year)
      const feb29 = new Date('2028-02-29');
      feb29.setDate(feb29.getDate() + 1);
      expect(feb29.toISOString().split('T')[0]).toBe('2028-03-01');
    });
  });

  describe('invalid dates', () => {
    it('handles invalid date input', () => {
      const invalidDate = new Date('invalid');
      expect(isNaN(invalidDate.getTime())).toBe(true);
    });

    it('invalid date in calculation returns NaN', () => {
      const invalidDate = new Date('invalid');
      const validDate = new Date('2026-06-15');
      const diff = calculateDaysBetween(invalidDate, validDate);
      expect(isNaN(diff)).toBe(true);
    });
  });
});
