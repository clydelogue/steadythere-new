import { describe, it, expect } from 'vitest';
import type { MilestoneCategory, OrgRole, MilestoneStatus, EventStatus } from '@/types/database';

/**
 * Tests for validation logic patterns used throughout the application.
 *
 * NOTE: The codebase currently does not use Zod schemas for form validation.
 * Validation is done imperatively inline in form handlers.
 *
 * This test file documents and tests the validation patterns that exist,
 * making it easier to refactor to Zod schemas in the future if desired.
 */

// Valid category values from the database types
const VALID_CATEGORIES: MilestoneCategory[] = [
  'VENUE',
  'CATERING',
  'MARKETING',
  'LOGISTICS',
  'PERMITS',
  'SPONSORS',
  'VOLUNTEERS',
  'GENERAL',
];

const VALID_ROLES: OrgRole[] = [
  'org_admin',
  'event_manager',
  'vendor',
  'partner',
  'volunteer',
];

const VALID_MILESTONE_STATUSES: MilestoneStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
  'SKIPPED',
];

const VALID_EVENT_STATUSES: EventStatus[] = [
  'PLANNING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
];

// Validation helper functions (mirroring inline validation logic)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidCategory(category: string): category is MilestoneCategory {
  return VALID_CATEGORIES.includes(category as MilestoneCategory);
}

function isValidRole(role: string): role is OrgRole {
  return VALID_ROLES.includes(role as OrgRole);
}

function isNonEmptyString(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveNumber(value: number | null | undefined): boolean {
  return typeof value === 'number' && value >= 0;
}

function isValidDaysBeforeEvent(days: number): boolean {
  return typeof days === 'number' && Number.isInteger(days) && days >= 0;
}

describe('email validation', () => {
  it('accepts valid email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.org')).toBe(true);
    expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
  });

  it('rejects invalid email formats', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('noatsign.com')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
    expect(isValidEmail('no@domain')).toBe(false);
  });
});

describe('category validation', () => {
  it('accepts valid milestone categories', () => {
    VALID_CATEGORIES.forEach(category => {
      expect(isValidCategory(category)).toBe(true);
    });
  });

  it('rejects invalid categories', () => {
    expect(isValidCategory('INVALID')).toBe(false);
    expect(isValidCategory('')).toBe(false);
    expect(isValidCategory('venue')).toBe(false); // lowercase
    expect(isValidCategory('Venue')).toBe(false); // mixed case
    expect(isValidCategory('OTHER')).toBe(false);
  });

  it('falls back to GENERAL for invalid AI-generated categories', () => {
    const processCategory = (category: string): MilestoneCategory =>
      isValidCategory(category) ? category : 'GENERAL';

    expect(processCategory('VENUE')).toBe('VENUE');
    expect(processCategory('invalid')).toBe('GENERAL');
    expect(processCategory('')).toBe('GENERAL');
  });
});

describe('role validation', () => {
  it('accepts valid roles', () => {
    VALID_ROLES.forEach(role => {
      expect(isValidRole(role)).toBe(true);
    });
  });

  it('rejects invalid roles', () => {
    expect(isValidRole('admin')).toBe(false);
    expect(isValidRole('ADMIN')).toBe(false);
    expect(isValidRole('owner')).toBe(false);
    expect(isValidRole('')).toBe(false);
    expect(isValidRole('superuser')).toBe(false);
  });
});

describe('string validation', () => {
  describe('isNonEmptyString', () => {
    it('accepts non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('  hello  ')).toBe(true);
      expect(isNonEmptyString('a')).toBe(true);
    });

    it('rejects empty or whitespace-only strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString('\t\n')).toBe(false);
    });

    it('rejects null and undefined', () => {
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
    });
  });
});

describe('number validation', () => {
  describe('isPositiveNumber', () => {
    it('accepts positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(100)).toBe(true);
      expect(isPositiveNumber(0.5)).toBe(true);
    });

    it('accepts zero', () => {
      expect(isPositiveNumber(0)).toBe(true);
    });

    it('rejects negative numbers', () => {
      expect(isPositiveNumber(-1)).toBe(false);
      expect(isPositiveNumber(-100)).toBe(false);
    });

    it('rejects null and undefined', () => {
      expect(isPositiveNumber(null)).toBe(false);
      expect(isPositiveNumber(undefined)).toBe(false);
    });
  });

  describe('isValidDaysBeforeEvent', () => {
    it('accepts valid days before event', () => {
      expect(isValidDaysBeforeEvent(0)).toBe(true);
      expect(isValidDaysBeforeEvent(30)).toBe(true);
      expect(isValidDaysBeforeEvent(365)).toBe(true);
    });

    it('rejects negative days', () => {
      expect(isValidDaysBeforeEvent(-1)).toBe(false);
      expect(isValidDaysBeforeEvent(-30)).toBe(false);
    });

    it('rejects non-integer days', () => {
      expect(isValidDaysBeforeEvent(30.5)).toBe(false);
      expect(isValidDaysBeforeEvent(7.1)).toBe(false);
    });
  });
});

describe('template form validation', () => {
  interface TemplateForm {
    name: string;
    description?: string;
    milestones: {
      title: string;
      description?: string;
      category: string;
      days_before_event: number;
    }[];
  }

  function validateTemplateForm(form: TemplateForm): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!isNonEmptyString(form.name)) {
      errors.push('Template name is required');
    }

    if (form.milestones.length === 0) {
      errors.push('At least one milestone is required');
    }

    form.milestones.forEach((milestone, index) => {
      if (!isNonEmptyString(milestone.title)) {
        errors.push(`Milestone ${index + 1}: title is required`);
      }
      if (!isValidCategory(milestone.category)) {
        errors.push(`Milestone ${index + 1}: invalid category`);
      }
      if (!isValidDaysBeforeEvent(milestone.days_before_event)) {
        errors.push(`Milestone ${index + 1}: invalid days before event`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  it('accepts valid template data', () => {
    const validForm: TemplateForm = {
      name: 'Golf Tournament',
      description: 'Annual charity golf tournament',
      milestones: [
        {
          title: 'Book venue',
          description: 'Reserve the golf course',
          category: 'VENUE',
          days_before_event: 90,
        },
      ],
    };

    const result = validateTemplateForm(validForm);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects missing name', () => {
    const invalidForm: TemplateForm = {
      name: '',
      milestones: [
        { title: 'Task', category: 'GENERAL', days_before_event: 30 },
      ],
    };

    const result = validateTemplateForm(invalidForm);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Template name is required');
  });

  it('rejects empty milestones array', () => {
    const invalidForm: TemplateForm = {
      name: 'Test Template',
      milestones: [],
    };

    const result = validateTemplateForm(invalidForm);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one milestone is required');
  });

  it('rejects milestone with empty title', () => {
    const invalidForm: TemplateForm = {
      name: 'Test Template',
      milestones: [
        { title: '', category: 'GENERAL', days_before_event: 30 },
      ],
    };

    const result = validateTemplateForm(invalidForm);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Milestone 1: title is required');
  });

  it('accepts empty description', () => {
    const validForm: TemplateForm = {
      name: 'Test Template',
      milestones: [
        { title: 'Task', category: 'GENERAL', days_before_event: 30 },
      ],
    };

    const result = validateTemplateForm(validForm);
    expect(result.valid).toBe(true);
  });
});

describe('invitation form validation', () => {
  interface InvitationForm {
    email: string;
    role: string;
    message?: string;
  }

  function validateInvitationForm(form: InvitationForm): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!isValidEmail(form.email)) {
      errors.push('Invalid email format');
    }

    if (!isValidRole(form.role)) {
      errors.push('Invalid role');
    }

    return { valid: errors.length === 0, errors };
  }

  it('accepts valid invitation data', () => {
    const validForm: InvitationForm = {
      email: 'user@example.com',
      role: 'vendor',
      message: 'Welcome to the team!',
    };

    const result = validateInvitationForm(validForm);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts valid email', () => {
    const form: InvitationForm = { email: 'test@domain.com', role: 'volunteer' };
    expect(validateInvitationForm(form).valid).toBe(true);
  });

  it('rejects invalid email format', () => {
    const form: InvitationForm = { email: 'invalid-email', role: 'volunteer' };
    const result = validateInvitationForm(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid email format');
  });

  it('accepts valid role', () => {
    VALID_ROLES.forEach(role => {
      const form: InvitationForm = { email: 'test@example.com', role };
      expect(validateInvitationForm(form).valid).toBe(true);
    });
  });

  it('rejects invalid role', () => {
    const form: InvitationForm = { email: 'test@example.com', role: 'superadmin' };
    const result = validateInvitationForm(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid role');
  });
});

describe('event status transitions', () => {
  const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
    PLANNING: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['COMPLETED', 'CANCELLED'],
    COMPLETED: ['ARCHIVED'],
    CANCELLED: ['ARCHIVED'],
    ARCHIVED: [], // Terminal state
  };

  function isValidStatusTransition(from: EventStatus, to: EventStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  it('allows valid transitions from PLANNING', () => {
    expect(isValidStatusTransition('PLANNING', 'ACTIVE')).toBe(true);
    expect(isValidStatusTransition('PLANNING', 'CANCELLED')).toBe(true);
  });

  it('rejects invalid transitions from PLANNING', () => {
    expect(isValidStatusTransition('PLANNING', 'COMPLETED')).toBe(false);
    expect(isValidStatusTransition('PLANNING', 'ARCHIVED')).toBe(false);
  });

  it('allows valid transitions from ACTIVE', () => {
    expect(isValidStatusTransition('ACTIVE', 'COMPLETED')).toBe(true);
    expect(isValidStatusTransition('ACTIVE', 'CANCELLED')).toBe(true);
  });

  it('rejects invalid transitions from ACTIVE', () => {
    expect(isValidStatusTransition('ACTIVE', 'PLANNING')).toBe(false);
    expect(isValidStatusTransition('ACTIVE', 'ARCHIVED')).toBe(false);
  });

  it('allows archiving completed events', () => {
    expect(isValidStatusTransition('COMPLETED', 'ARCHIVED')).toBe(true);
  });

  it('allows archiving cancelled events', () => {
    expect(isValidStatusTransition('CANCELLED', 'ARCHIVED')).toBe(true);
  });

  it('prevents any transitions from ARCHIVED', () => {
    VALID_EVENT_STATUSES.forEach(status => {
      expect(isValidStatusTransition('ARCHIVED', status)).toBe(false);
    });
  });
});

describe('milestone status transitions', () => {
  const VALID_MS_TRANSITIONS: Record<MilestoneStatus, MilestoneStatus[]> = {
    NOT_STARTED: ['IN_PROGRESS', 'SKIPPED'],
    IN_PROGRESS: ['COMPLETED', 'BLOCKED', 'NOT_STARTED'],
    BLOCKED: ['IN_PROGRESS', 'SKIPPED'],
    COMPLETED: ['IN_PROGRESS'], // Can re-open
    SKIPPED: ['NOT_STARTED'], // Can un-skip
  };

  function isValidMilestoneTransition(from: MilestoneStatus, to: MilestoneStatus): boolean {
    return VALID_MS_TRANSITIONS[from]?.includes(to) ?? false;
  }

  it('allows starting a milestone', () => {
    expect(isValidMilestoneTransition('NOT_STARTED', 'IN_PROGRESS')).toBe(true);
  });

  it('allows completing an in-progress milestone', () => {
    expect(isValidMilestoneTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
  });

  it('allows blocking an in-progress milestone', () => {
    expect(isValidMilestoneTransition('IN_PROGRESS', 'BLOCKED')).toBe(true);
  });

  it('allows unblocking a blocked milestone', () => {
    expect(isValidMilestoneTransition('BLOCKED', 'IN_PROGRESS')).toBe(true);
  });

  it('allows skipping a not-started milestone', () => {
    expect(isValidMilestoneTransition('NOT_STARTED', 'SKIPPED')).toBe(true);
  });

  it('allows re-opening a completed milestone', () => {
    expect(isValidMilestoneTransition('COMPLETED', 'IN_PROGRESS')).toBe(true);
  });
});
