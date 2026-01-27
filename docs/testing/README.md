# SteadyThere Test Suite Implementation Plan

This directory contains detailed task breakdowns for implementing a comprehensive test suite.

## Quick Start

Each stream is designed to be worked on in a **separate branch** and **separate Claude Code session**. They can be done in parallel after Stream A (infrastructure) is complete.

---

## Streams Overview

| Stream | Branch | Priority | Effort | Dependencies |
|--------|--------|----------|--------|--------------|
| **A** | `test/infrastructure` | 🔴 Critical | Small | None - do first |
| **B** | `test/unit-pure-logic` | 🔴 Critical | Small | Best after A |
| **D** | `test/hooks-queries` | 🟡 High | Medium | Best after A |
| **I** | `test/integration-auth` | 🔴 Critical | Medium | Best after A, B |

---

## Execution Order

### Phase 1: Foundation (do this first)
```bash
git checkout -b test/infrastructure
# Complete Stream A tasks
# PR and merge
```

### Phase 2: Parallel Work (after Phase 1 merges)

Start up to 4 Claude Code sessions in parallel:

```bash
# Session 1
git checkout -b test/unit-pure-logic

# Session 2
git checkout -b test/hooks-queries

# Session 3
git checkout -b test/integration-auth

# Session 4 (optional - pick another stream from the full plan)
git checkout -b test/hooks-mutations
```

---

## Starting a Claude Code Session

For each stream, give Claude this context:

### Stream A: Infrastructure
```
I'm implementing test infrastructure for a React/Supabase app.
Branch: test/infrastructure
Read: docs/testing/STREAM-A-infrastructure.md
Start with Task 1 and work sequentially.
```

### Stream B: Unit Tests
```
I'm adding unit tests for pure logic functions.
Branch: test/unit-pure-logic
Read: docs/testing/STREAM-B-unit-pure-logic.md
Start with permissions tests - they're most critical.
```

### Stream D: Hook Tests
```
I'm adding tests for React Query data fetching hooks.
Branch: test/hooks-queries
Read: docs/testing/STREAM-D-hooks-queries.md
Read the hook implementations first, then write tests.
```

### Stream I: Integration Tests
```
I'm adding integration tests for authentication flows.
Branch: test/integration-auth
Read: docs/testing/STREAM-I-integration-auth.md
Start by understanding AuthContext, then create test utilities.
```

---

## File Locations

After all streams are complete, the test structure will be:

```
src/
├── test/
│   ├── setup.ts              # Vitest setup
│   ├── test-utils.tsx        # Render helpers, mock factories
│   ├── supabase-mocks.ts     # Supabase mock utilities (Stream A)
│   └── integration-utils.tsx # Full app render helpers (Stream I)
├── lib/
│   ├── permissions.test.ts   # Stream B
│   ├── utils.test.ts         # Stream B
│   ├── date-utils.test.ts    # Stream B
│   ├── validation.test.ts    # Stream B
│   └── ai.test.ts            # Existing + expanded
├── hooks/
│   └── __tests__/
│       ├── setup.ts          # Stream D
│       ├── useEvents.test.ts # Stream D
│       ├── useTemplates.test.ts # Stream D
│       ├── useMilestones.test.ts # Stream D
│       └── useUserManagement.test.ts # Stream D
├── components/
│   └── __tests__/
│       ├── ProtectedRoute.test.tsx # Stream I
│       └── org-switcher.test.tsx   # Stream I
└── pages/
    └── __tests__/
        ├── auth-signup.test.tsx      # Stream I
        ├── auth-signin.test.tsx      # Stream I
        ├── auth-signout.test.tsx     # Stream I
        ├── invitation-new-user.test.tsx    # Stream I
        └── invitation-existing-user.test.tsx # Stream I

e2e/                          # Stream A (Playwright)
├── fixtures.ts
└── example.spec.ts

playwright.config.ts          # Stream A
```

---

## Commands Reference

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/lib/permissions.test.ts

# Run tests matching pattern
npm test -- --testPathPattern=auth

# Run with coverage
npm run test:coverage

# Run E2E tests (after Stream A)
npm run test:e2e

# Run E2E with UI
npm run test:e2e:ui
```

---

## Definition of Done (All Streams)

Before merging any stream:

- [ ] All new tests pass
- [ ] No regression in existing tests
- [ ] Test file follows established patterns
- [ ] PR has clear description of what's tested
- [ ] Coverage doesn't decrease

---

## Future Streams (Not Yet Detailed)

These can be added later:

- **Stream E**: `test/hooks-mutations` - Create/update/delete operations
- **Stream F**: `test/components-forms` - Form components
- **Stream G**: `test/components-display` - Display components
- **Stream J**: `test/integration-events` - Event CRUD flows
- **Stream K**: `test/integration-templates` - Template flows
- **Stream L**: `test/integration-team` - Team management flows
- **Stream M**: `test/e2e-critical` - End-to-end critical paths
- **Stream N**: `test/e2e-multitenancy` - Multi-tenant isolation tests

Want detailed task files for these? Just ask.
