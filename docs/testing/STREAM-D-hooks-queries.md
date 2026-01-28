# Stream D: Hook Tests - Data Fetching (Queries)

**Branch name:** `test/hooks-queries`
**Effort:** Medium (2-3 sessions)
**Dependencies:** Stream A (mock factories) is helpful but not required
**Why this matters:** Data layer bugs cause the most confusing regressions

---

## Goal

Test all React Query hooks that fetch data. Focus on:
- Correct Supabase queries being made
- Data transformations
- Error handling
- Loading states
- Cache behavior

---

## Hooks to Test

Located in `src/hooks/`:
- `useEvents.ts` - event list and single event
- `useTemplates.ts` - template list and single template
- `useMilestones.ts` - milestones for an event
- `useUserManagement.ts` - org members
- `useInvitations.ts` - pending invitations
- Any other `use*.ts` files with queries

---

## Tasks

### Task 1: Set Up Hook Testing Pattern

**File:** `src/hooks/__tests__/setup.ts` (new directory and file)

Establish the pattern for testing hooks:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { createWrapper, createMockEvent, createMockOrganization } from '@/test/test-utils';

// Standard mock setup for all hook tests
export function setupHookTest() {
  const mockOrg = createMockOrganization({ id: 'org-123' });
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  // Mock AuthContext
  vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
      currentOrg: mockOrg,
      user: mockUser,
    }),
  }));

  return { mockOrg, mockUser };
}

// Helper to create chainable Supabase mock
export function createSupabaseMock() {
  const chain = {
    data: null as any,
    error: null as any,

    from: vi.fn(() => chain),
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: chain.data, error: chain.error })),
    then: vi.fn((resolve) => resolve({ data: chain.data, error: chain.error })),

    // Fluent setters
    resolvesWith(data: any) {
      chain.data = data;
      chain.error = null;
      return chain;
    },
    rejectsWith(error: any) {
      chain.data = null;
      chain.error = error;
      return chain;
    },
  };

  return chain;
}
```

**Acceptance criteria:**
- Reusable test setup for all hook tests
- Chainable Supabase mock that mimics real behavior
- Clear pattern documented

---

### Task 2: Test useEvents Hook

**File:** `src/hooks/__tests__/useEvents.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEvents, useEvent } from '../useEvents';
import { createWrapper, createMockEvent, createMockMilestone } from '@/test/test-utils';

describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEvents (list)', () => {
    it('fetches events for current organization', async () => {
      // Mock Supabase to return events
      // Verify correct org_id filter
      // Verify data is returned
    });

    it('includes related event_type data', async () => {
      // Verify join with event_types works
    });

    it('includes owner profile data', async () => {
      // Verify join with profiles works
    });

    it('includes milestone counts', async () => {
      // Verify milestone aggregation
    });

    it('orders by event_date ascending', async () => {
      // Verify order call
    });

    it('returns empty array when no events', async () => {
      // Mock empty response
      // Verify returns []
    });

    it('handles fetch error gracefully', async () => {
      // Mock error response
      // Verify error state
    });

    it('does not fetch when no currentOrg', async () => {
      // Mock null currentOrg
      // Verify query not made
    });
  });

  describe('useEvent (single)', () => {
    it('fetches single event by ID', async () => {
      // Mock single event response
      // Verify eq('id', eventId) called
    });

    it('includes all milestones for the event', async () => {
      // Verify milestones included and sorted
    });

    it('returns null for non-existent event', async () => {
      // Mock null response
    });

    it('does not fetch when eventId is undefined', async () => {
      // Verify query not made
    });
  });
});

describe('event data transformations', () => {
  it('computes milestone completion percentage', () => {
    const event = createMockEvent();
    const milestones = [
      createMockMilestone({ status: 'COMPLETED' }),
      createMockMilestone({ status: 'COMPLETED' }),
      createMockMilestone({ status: 'IN_PROGRESS' }),
      createMockMilestone({ status: 'NOT_STARTED' }),
    ];

    const completed = milestones.filter(m => m.status === 'COMPLETED').length;
    const percentage = Math.round((completed / milestones.length) * 100);

    expect(percentage).toBe(50);
  });

  it('identifies overdue milestones', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const milestone = createMockMilestone({
      status: 'NOT_STARTED',
      due_date: yesterday.toISOString(),
    });

    const isOverdue = new Date(milestone.due_date!) < now &&
      !['COMPLETED', 'SKIPPED'].includes(milestone.status!);

    expect(isOverdue).toBe(true);
  });
});
```

**Acceptance criteria:**
- All useEvents behaviors tested
- All useEvent behaviors tested
- Data transformations verified
- Error states handled
- Loading states verified

---

### Task 3: Test useTemplates Hook

**File:** `src/hooks/__tests__/useTemplates.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTemplates, useTemplate } from '../useTemplates';

describe('useTemplates', () => {
  describe('useTemplates (list)', () => {
    it('fetches active templates for current organization', async () => {
      // Verify is_active filter
      // Verify org_id filter
    });

    it('computes milestone_count from aggregation', async () => {
      // Mock response with milestone_templates count
      // Verify transformation
    });

    it('computes events_count from related events', async () => {
      // Mock response with events array
      // Verify count
    });

    it('computes last_used_at from most recent event', async () => {
      // Mock events with created_at dates
      // Verify sorts and picks most recent
    });

    it('returns null for last_used_at when no events', async () => {
      // Mock template with no events
      // Verify null
    });

    it('orders by name ascending', async () => {
      // Verify order call
    });
  });

  describe('useTemplate (single)', () => {
    it('fetches template with all details', async () => {
      // Verify full select
    });

    it('includes milestone_templates sorted by sort_order', async () => {
      // Verify sort_order sorting
    });

    it('includes template_versions for history', async () => {
      // Verify versions included
    });

    it('includes current version info', async () => {
      // Verify current_version join
    });
  });
});

describe('template data transformations', () => {
  it('sorts milestones by sort_order', () => {
    const milestones = [
      { id: '1', sort_order: 2 },
      { id: '2', sort_order: 0 },
      { id: '3', sort_order: 1 },
    ];

    const sorted = [...milestones].sort((a, b) =>
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    expect(sorted.map(m => m.id)).toEqual(['2', '3', '1']);
  });

  it('handles null sort_order values', () => {
    const milestones = [
      { id: '1', sort_order: null },
      { id: '2', sort_order: 1 },
      { id: '3', sort_order: null },
    ];

    const sorted = [...milestones].sort((a, b) =>
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    // Nulls treated as 0
    expect(sorted[0].sort_order).toBeNull();
  });
});
```

**Acceptance criteria:**
- All list query behaviors tested
- All single query behaviors tested
- Computed fields verified
- Sorting verified

---

### Task 4: Test useMilestones Hook

**File:** `src/hooks/__tests__/useMilestones.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMilestones, useAllMilestones } from '../useMilestones';

describe('useMilestones', () => {
  describe('useMilestones (for single event)', () => {
    it('fetches milestones for specific event', async () => {
      // Verify event_id filter
    });

    it('includes assignee profile data', async () => {
      // Verify join with profiles
    });

    it('orders by due_date', async () => {
      // Verify order
    });

    it('returns empty array for event with no milestones', async () => {});
  });

  describe('useAllMilestones (org-wide)', () => {
    it('fetches all milestones for organization', async () => {
      // Via events.organization_id
    });

    it('includes parent event data', async () => {
      // Verify event join
    });

    it('filters by status when provided', async () => {
      // Test status filter
    });

    it('filters by date range when provided', async () => {
      // Test date filters
    });
  });
});

describe('milestone status logic', () => {
  it('categorizes milestone as overdue', () => {
    // Past due_date + not completed/skipped
  });

  it('categorizes milestone as due soon', () => {
    // Due within 7 days + not completed
  });

  it('categorizes milestone as blocked', () => {
    // status === 'BLOCKED'
  });

  it('categorizes milestone as on track', () => {
    // Future due date + in progress or not started
  });
});
```

**Acceptance criteria:**
- Event-specific queries tested
- Org-wide queries tested
- Filters tested
- Status categorization logic tested

---

### Task 5: Test useUserManagement Hook

**File:** `src/hooks/__tests__/useUserManagement.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserManagement, useInvitations, useInvitationByToken } from '../useUserManagement';

describe('useUserManagement', () => {
  describe('useUserManagement (org members)', () => {
    it('fetches members for current organization', async () => {
      // Verify org_id filter
    });

    it('includes profile data for each member', async () => {
      // Verify join with profiles
    });

    it('includes role information', async () => {
      // Verify role field
    });

    it('returns empty array when no members', async () => {});

    it('handles member without profile gracefully', async () => {
      // Edge case: orphaned membership
    });
  });

  describe('useInvitations', () => {
    it('fetches pending invitations only', async () => {
      // Verify status = pending filter
    });

    it('includes inviter profile data', async () => {
      // Verify join with profiles (invited_by)
    });

    it('orders by created_at descending', async () => {
      // Most recent first
    });

    it('excludes expired invitations', async () => {
      // Verify expires_at filter or status filter
    });
  });

  describe('useInvitationByToken', () => {
    it('fetches invitation by token', async () => {
      // Verify token filter
    });

    it('includes organization data', async () => {
      // Verify org join for display
    });

    it('returns null for invalid token', async () => {});

    it('returns null for expired invitation', async () => {});

    it('does not require authentication', async () => {
      // This is a public query
    });
  });
});

describe('role helpers', () => {
  it('identifies admin roles', () => {
    expect(isAdminRole('org_admin')).toBe(true);
    expect(isAdminRole('event_manager')).toBe(false);
  });

  it('sorts members by role hierarchy', () => {
    const members = [
      { role: 'volunteer' },
      { role: 'org_admin' },
      { role: 'event_manager' },
    ];

    const roleOrder = ['org_admin', 'event_manager', 'vendor', 'partner', 'volunteer'];
    const sorted = [...members].sort((a, b) =>
      roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
    );

    expect(sorted[0].role).toBe('org_admin');
  });
});
```

**Acceptance criteria:**
- Member fetching tested
- Invitation fetching tested
- Token lookup tested (public query)
- Role helpers tested

---

### Task 6: Test Query Cache Behavior

**File:** `src/hooks/__tests__/cache-behavior.test.ts` (new file)

Test that React Query cache is configured correctly:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

describe('query cache behavior', () => {
  it('caches query results', async () => {
    // Make query, verify cached
    // Make same query, verify no new network call
  });

  it('uses correct cache keys', async () => {
    // Verify ['events', orgId] pattern
    // Verify ['event', eventId] pattern
  });

  it('invalidates related queries on mutation', async () => {
    // After createEvent, events list is invalidated
  });

  it('refetches on window focus when configured', async () => {
    // Test refetchOnWindowFocus behavior
  });

  it('shares cache across components', async () => {
    // Two components using same query share data
  });
});
```

**Acceptance criteria:**
- Cache key patterns verified
- Invalidation behavior understood
- No duplicate fetches for same data

---

## Definition of Done

- [ ] Hook test setup pattern documented
- [ ] `useEvents` and `useEvent` fully tested
- [ ] `useTemplates` and `useTemplate` fully tested
- [ ] `useMilestones` and `useAllMilestones` fully tested
- [ ] `useUserManagement` hooks fully tested
- [ ] Cache behavior tested
- [ ] All tests pass
- [ ] PR created

---

## Commands to Run

```bash
# Create branch
git checkout -b test/hooks-queries

# Run hook tests
npm test -- src/hooks/

# Watch mode for development
npm run test:watch -- src/hooks/
```

---

## Notes for Claude Code Session

When starting a Claude Code session for this stream:

> "I'm adding tests for React Query data fetching hooks. The branch is `test/hooks-queries`. Please read `docs/testing/STREAM-D-hooks-queries.md` for the full task list. Start by reading the actual hook implementations in `src/hooks/` to understand what needs testing. Focus on useEvents first, then templates, then milestones, then user management."
