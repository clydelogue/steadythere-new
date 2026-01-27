# Stream A: Test Infrastructure & Utilities

**Branch name:** `test/infrastructure`
**Effort:** Small (1-2 sessions)
**Dependencies:** None - do this first
**Merge before:** All other streams benefit from this

---

## Goal

Set up the foundational test infrastructure that all other test streams will use. This includes mock factories, MSW handlers for Supabase, and Playwright configuration.

---

## Tasks

### Task 1: Expand Mock Factories

**File:** `src/test/test-utils.tsx`

The existing factories are good but incomplete. Add factories for:

```typescript
// Add these factory functions:

createMockInvitation({
  id?: string,
  organization_id?: string,
  email?: string,
  role?: OrgRole,
  token?: string,
  status?: 'pending' | 'accepted' | 'expired' | 'cancelled',
  expires_at?: string,
  invited_by?: string,
})

createMockNotification({
  id?: string,
  user_id?: string,
  organization_id?: string,
  type?: NotificationType,
  channel?: NotificationChannel,
  status?: NotificationStatus,
  title?: string,
  body?: string,
  scheduled_for?: string,
  sent_at?: string,
  related_event_id?: string,
  related_milestone_id?: string,
})

createMockDocument({
  id?: string,
  organization_id?: string,
  event_id?: string,
  milestone_id?: string,
  filename?: string,
  storage_path?: string,
  file_size?: number,
  mime_type?: string,
  category?: DocumentCategory,
  source?: DocumentSource,
})

createMockOrganizationMember({
  id?: string,
  organization_id?: string,
  user_id?: string,
  role?: OrgRole,
  profile?: Profile,  // nested mock
})

createMockProfile({
  id?: string,
  email?: string,
  full_name?: string,
  avatar_url?: string,
  timezone?: string,
})
```

**Acceptance criteria:**
- All factories return valid typed objects
- All factories use sensible defaults
- All factories allow partial overrides
- Export all factories from test-utils

---

### Task 2: Create AuthContext Test Wrapper

**File:** `src/test/test-utils.tsx`

Create a configurable auth wrapper for testing authenticated components:

```typescript
interface MockAuthState {
  user?: User | null;
  session?: Session | null;
  profile?: Profile | null;
  currentOrg?: Organization | null;
  currentOrgMember?: OrganizationMember | null;
  currentRole?: OrgRole | null;
  organizations?: OrganizationMember[];
  isLoading?: boolean;
  // Permission overrides
  permissions?: Permission[];
}

function createMockAuthContext(overrides?: Partial<MockAuthState>): AuthContextType

// Wrapper component
function AuthTestWrapper({
  children,
  authState
}: {
  children: React.ReactNode;
  authState?: Partial<MockAuthState>;
})

// Updated renderWithProviders
function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    authState?: Partial<MockAuthState>;
    queryClient?: QueryClient;
    route?: string;  // for router testing
  }
)
```

**Acceptance criteria:**
- Can render components with specific auth states
- Can test unauthenticated state
- Can test different roles/permissions
- Can test org switching scenarios

---

### Task 3: Create Supabase Mock Helpers

**File:** `src/test/supabase-mocks.ts` (new file)

Create reusable Supabase query mocks:

```typescript
// Builder pattern for chaining
export function mockSupabaseQuery() {
  return {
    from: (table: string) => ({
      select: (query?: string) => ({
        eq: (column: string, value: any) => /* chainable */,
        order: (column: string, options?: any) => /* chainable */,
        single: () => /* returns promise */,
        // ... other methods
      }),
      insert: (data: any) => /* ... */,
      update: (data: any) => /* ... */,
      delete: () => /* ... */,
    }),
    // Return configured mock
    build: () => mockClient,
    // Set return data
    resolves: (data: any) => /* ... */,
    rejects: (error: any) => /* ... */,
  };
}

// Pre-built scenarios
export const supabaseMocks = {
  // Auth
  signIn: { success: (user) => ..., error: (msg) => ... },
  signUp: { success: (user) => ..., error: (msg) => ... },
  signOut: { success: () => ..., error: (msg) => ... },

  // Queries
  events: {
    list: (events) => ...,
    single: (event) => ...,
    empty: () => ...,
    error: (msg) => ...,
  },
  templates: { /* same pattern */ },
  milestones: { /* same pattern */ },
  invitations: { /* same pattern */ },
  members: { /* same pattern */ },
};
```

**Acceptance criteria:**
- Mocks are type-safe
- Easy to set up success/error scenarios
- Chainable like real Supabase client
- Common scenarios pre-built

---

### Task 4: Add Test Coverage Reporting

**File:** `vitest.config.ts`

Update Vitest config to generate coverage reports:

```typescript
export default defineConfig({
  test: {
    // ... existing config
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/components/ui/', // shadcn components
      ],
      // Thresholds (start low, increase over time)
      thresholds: {
        statements: 20,
        branches: 20,
        functions: 20,
        lines: 20,
      },
    },
  },
});
```

**File:** `package.json`

Add coverage scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

**Acceptance criteria:**
- `npm run test:coverage` generates HTML report
- Coverage excludes irrelevant files
- Thresholds set (can be raised later)

---

### Task 5: Install and Configure Playwright

**Install:**
```bash
npm install -D @playwright/test
npx playwright install
```

**File:** `playwright.config.ts` (new file)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server for tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

**File:** `e2e/example.spec.ts` (new file)

```typescript
import { test, expect } from '@playwright/test';

test('app loads', async ({ page }) => {
  await page.goto('/');
  // Should redirect to auth if not logged in
  await expect(page).toHaveURL(/.*auth/);
});
```

**File:** `package.json`

Add Playwright scripts:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**Acceptance criteria:**
- Playwright installed and configured
- Example test passes
- Can run with `npm run test:e2e`

---

### Task 6: Create E2E Test Utilities

**File:** `e2e/fixtures.ts` (new file)

```typescript
import { test as base } from '@playwright/test';

// Extend base test with app-specific fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  testUser: { email: string; password: string };
}>({
  testUser: async ({}, use) => {
    // Use test credentials (requires test user in Supabase)
    await use({
      email: 'test@example.com',
      password: 'testpassword123',
    });
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Login before test
    await page.goto('/auth');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

**Acceptance criteria:**
- Custom fixtures for authenticated tests
- Easy to add more fixtures later
- Documents pattern for E2E tests

---

## Definition of Done

- [ ] All mock factories created and exported
- [ ] AuthContext wrapper working with renderWithProviders
- [ ] Supabase mock helpers created
- [ ] Coverage reporting configured and working
- [ ] Playwright installed with example test passing
- [ ] E2E fixtures created
- [ ] All existing tests still pass
- [ ] PR created with clear description

---

## Commands to Run

```bash
# Create branch
git checkout -b test/infrastructure

# Install new deps
npm install -D @playwright/test
npx playwright install

# Run tests to verify nothing broke
npm test

# Check coverage
npm run test:coverage

# Run E2E
npm run test:e2e
```

---

## Notes for Claude Code Session

When starting a Claude Code session for this stream:

> "I'm implementing test infrastructure for a React/Supabase app. The branch is `test/infrastructure`. Please read `docs/testing/STREAM-A-infrastructure.md` for the full task list. Start with Task 1 (mock factories) and work through sequentially. The existing test setup is in `src/test/test-utils.tsx` and `vitest.config.ts`."
