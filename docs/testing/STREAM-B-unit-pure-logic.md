# Stream B: Unit Tests - Pure Logic

**Branch name:** `test/unit-pure-logic`
**Effort:** Small (1 session)
**Dependencies:** Ideally after Stream A, but can start in parallel
**Why this matters:** Permissions are critical - bugs here affect security

---

## Goal

Test all pure functions and business logic that don't require React or Supabase. These are the safest to refactor once tested.

---

## Tasks

### Task 1: Test Permissions Module

**File to test:** `src/lib/permissions.ts`
**Test file:** `src/lib/permissions.test.ts` (new file)

This is the most critical file to test. It controls what users can see and do.

```typescript
import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAnyPermission,
  canManageTeam,
  canManageOrg,
  canManageEvents,
  isAdminRole,
  ROLE_PERMISSIONS,
  Permission,
  OrgRole,
} from './permissions';

describe('permissions', () => {
  describe('ROLE_PERMISSIONS mapping', () => {
    it('org_admin has all permissions', () => {
      // Verify org_admin can do everything
    });

    it('event_manager has event permissions but not org permissions', () => {
      // Verify correct subset
    });

    it('vendor has limited permissions', () => {
      // Verify minimal access
    });

    it('partner has limited permissions', () => {
      // Verify minimal access
    });

    it('volunteer has minimal permissions', () => {
      // Verify most restricted
    });
  });

  describe('hasPermission', () => {
    it('returns true when role has the permission', () => {});
    it('returns false when role lacks the permission', () => {});
    it('handles null/undefined role gracefully', () => {});
    it('handles invalid permission gracefully', () => {});
  });

  describe('hasAnyPermission', () => {
    it('returns true if role has at least one permission', () => {});
    it('returns false if role has none of the permissions', () => {});
    it('handles empty permission array', () => {});
  });

  describe('canManageTeam', () => {
    it('returns true for org_admin', () => {});
    it('returns false for event_manager', () => {});
    it('returns false for vendor', () => {});
    it('returns false for partner', () => {});
    it('returns false for volunteer', () => {});
  });

  describe('canManageOrg', () => {
    it('returns true for org_admin', () => {});
    it('returns false for all other roles', () => {});
  });

  describe('canManageEvents', () => {
    it('returns true for org_admin', () => {});
    it('returns true for event_manager', () => {});
    it('returns false for vendor', () => {});
    it('returns false for partner', () => {});
    it('returns false for volunteer', () => {});
  });

  describe('isAdminRole', () => {
    it('returns true for org_admin', () => {});
    it('returns false for all other roles', () => {});
  });
});

describe('permission edge cases', () => {
  it('all roles in OrgRole have permission mappings', () => {
    // Ensure no role is missing from ROLE_PERMISSIONS
    const allRoles: OrgRole[] = ['org_admin', 'event_manager', 'vendor', 'partner', 'volunteer'];
    allRoles.forEach(role => {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    });
  });

  it('no permission is duplicated in a role', () => {
    // Each role's permissions should be unique
  });
});
```

**Acceptance criteria:**
- 100% line coverage on permissions.ts
- All roles tested for all helper functions
- Edge cases covered (null, undefined, invalid)

---

### Task 2: Test Utils Module

**File to test:** `src/lib/utils.ts`
**Test file:** `src/lib/utils.test.ts` (new file)

```typescript
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (classname utility)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('merges tailwind classes correctly', () => {
    // tailwind-merge specific behavior
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });

  it('handles array of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });
});
```

**Acceptance criteria:**
- All cn() behaviors tested
- Tailwind merge behavior verified

---

### Task 3: Test Date Calculation Logic

**File to create:** `src/lib/date-utils.ts` (extract if inline) or test inline
**Test file:** `src/lib/date-utils.test.ts` (new file)

The `days_before_event` calculations are used in templates and milestones:

```typescript
import { describe, it, expect } from 'vitest';

describe('date calculations', () => {
  describe('days_before_event to due_date', () => {
    it('calculates correct due date for 30 days before', () => {
      const eventDate = new Date('2026-06-15');
      const daysBeforeEvent = 30;

      const dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() - daysBeforeEvent);

      expect(dueDate.toISOString().split('T')[0]).toBe('2026-05-16');
    });

    it('handles month boundaries', () => {
      const eventDate = new Date('2026-03-05');
      const daysBeforeEvent = 10;

      const dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() - daysBeforeEvent);

      expect(dueDate.toISOString().split('T')[0]).toBe('2026-02-23');
    });

    it('handles year boundaries', () => {
      const eventDate = new Date('2026-01-10');
      const daysBeforeEvent = 20;

      const dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() - daysBeforeEvent);

      expect(dueDate.toISOString().split('T')[0]).toBe('2025-12-21');
    });

    it('handles leap year', () => {
      const eventDate = new Date('2028-03-01'); // 2028 is leap year
      const daysBeforeEvent = 1;

      const dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() - daysBeforeEvent);

      expect(dueDate.toISOString().split('T')[0]).toBe('2028-02-29');
    });

    it('handles 0 days before (due on event day)', () => {
      const eventDate = new Date('2026-06-15');
      const daysBeforeEvent = 0;

      const dueDate = new Date(eventDate);
      dueDate.setDate(dueDate.getDate() - daysBeforeEvent);

      expect(dueDate.toISOString().split('T')[0]).toBe('2026-06-15');
    });
  });

  describe('due_date to days_before_event (reverse)', () => {
    it('calculates days between dates', () => {
      const eventDate = new Date('2026-06-15');
      const dueDate = new Date('2026-05-16');

      const diffTime = eventDate.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      expect(diffDays).toBe(30);
    });
  });
});

describe('milestone status helpers', () => {
  it('identifies overdue milestones', () => {
    const now = new Date('2026-01-15');
    const dueDate = new Date('2026-01-10');
    const status = 'NOT_STARTED';

    const isOverdue = dueDate < now && !['COMPLETED', 'SKIPPED'].includes(status);
    expect(isOverdue).toBe(true);
  });

  it('does not mark completed as overdue', () => {
    const now = new Date('2026-01-15');
    const dueDate = new Date('2026-01-10');
    const status = 'COMPLETED';

    const isOverdue = dueDate < now && !['COMPLETED', 'SKIPPED'].includes(status);
    expect(isOverdue).toBe(false);
  });

  it('identifies upcoming milestones (due within 7 days)', () => {
    const now = new Date('2026-01-15');
    const dueDate = new Date('2026-01-20');

    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isDueSoon = diffDays > 0 && diffDays <= 7;

    expect(isDueSoon).toBe(true);
  });
});
```

**Acceptance criteria:**
- All date edge cases covered
- Month/year boundary handling verified
- Leap year tested

---

### Task 4: Test Form Validation Schemas

Find all Zod schemas used in forms and test them.

**Locate schemas:** Search for `z.object` in the codebase

**Test file:** `src/lib/validation.test.ts` (new file)

```typescript
import { describe, it, expect } from 'vitest';
// Import schemas from where they're defined

describe('event form schema', () => {
  it('accepts valid event data', () => {});
  it('rejects missing name', () => {});
  it('rejects invalid date format', () => {});
  it('rejects end_date before start_date', () => {});
});

describe('template form schema', () => {
  it('accepts valid template data', () => {});
  it('rejects empty name', () => {});
  it('accepts empty milestones array', () => {});
});

describe('milestone schema', () => {
  it('accepts valid milestone data', () => {});
  it('rejects invalid category', () => {});
  it('rejects negative days_before_event', () => {});
});

describe('invitation schema', () => {
  it('accepts valid email', () => {});
  it('rejects invalid email format', () => {});
  it('accepts valid role', () => {});
  it('rejects invalid role', () => {});
});
```

**Acceptance criteria:**
- All form schemas have tests
- Valid and invalid inputs tested
- Error messages verified where relevant

---

### Task 5: Test AI Parsing Logic (Expand Existing)

**File to test:** `src/lib/ai.ts`
**Existing test file:** `src/lib/ai.test.ts`

Expand the existing tests:

```typescript
describe('parseAIMilestones - edge cases', () => {
  it('handles empty response', () => {});
  it('handles malformed JSON', () => {});
  it('handles partial JSON', () => {});
  it('handles response with extra text before JSON', () => {});
  it('handles response with extra text after JSON', () => {});
  it('handles nested quotes in milestone titles', () => {});
  it('handles unicode characters', () => {});
  it('handles very long milestone titles', () => {});
  it('handles milestones with missing optional fields', () => {});
  it('handles invalid category values gracefully', () => {});
  it('handles invalid days_before_event values', () => {});
});

describe('generateMilestonesPrompt', () => {
  it('includes event name in prompt', () => {});
  it('includes event description in prompt', () => {});
  it('includes event date in prompt', () => {});
  it('handles missing description', () => {});
});
```

**Acceptance criteria:**
- All edge cases for AI parsing covered
- Graceful handling of malformed responses
- Prompt generation tested

---

## Definition of Done

- [ ] `src/lib/permissions.test.ts` - 100% coverage of permissions.ts
- [ ] `src/lib/utils.test.ts` - cn() utility tested
- [ ] `src/lib/date-utils.test.ts` - date calculations tested
- [ ] `src/lib/validation.test.ts` - form schemas tested (or note if none exist)
- [ ] `src/lib/ai.test.ts` - expanded edge case coverage
- [ ] All tests pass
- [ ] No regressions in existing tests
- [ ] PR created

---

## Commands to Run

```bash
# Create branch
git checkout -b test/unit-pure-logic

# Run just the new tests
npm test -- src/lib/

# Run with coverage
npm run test:coverage -- --include=src/lib/
```

---

## Notes for Claude Code Session

When starting a Claude Code session for this stream:

> "I'm adding unit tests for pure logic functions. The branch is `test/unit-pure-logic`. Please read `docs/testing/STREAM-B-unit-pure-logic.md` for the full task list. Start with Task 1 (permissions tests) as it's the most critical. Read `src/lib/permissions.ts` first to understand the implementation."
