import { test as base, Page } from '@playwright/test';

// Test user credentials interface
interface TestUser {
  email: string;
  password: string;
}

// Extended test fixtures
interface TestFixtures {
  authenticatedPage: Page;
  testUser: TestUser;
}

// Extend base test with app-specific fixtures
export const test = base.extend<TestFixtures>({
  // Test user credentials (requires test user in Supabase)
  testUser: async ({}, use) => {
    await use({
      email: 'test@example.com',
      password: 'testpassword123',
    });
  },

  // Authenticated page fixture - logs in before test
  authenticatedPage: async ({ page, testUser }, use) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in login form
    await page.fill('[name="email"], input[type="email"]', testUser.email);
    await page.fill('[name="password"], input[type="password"]', testUser.password);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for navigation to complete (should redirect to app or dashboard)
    await page.waitForURL(/\/(app|onboarding)/, { timeout: 10000 });

    // Use the authenticated page
    await use(page);
  },
});

// Re-export expect from Playwright
export { expect } from '@playwright/test';

// Page object helpers for common UI patterns
export class AuthPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[name="email"], input[type="email"]', email);
    await this.page.fill('[name="password"], input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async signup(email: string, password: string, name?: string) {
    await this.page.goto('/signup');
    if (name) {
      await this.page.fill('[name="name"], input[name="name"]', name);
    }
    await this.page.fill('[name="email"], input[type="email"]', email);
    await this.page.fill('[name="password"], input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }
}

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/app');
  }

  async waitForLoad() {
    // Wait for dashboard content to load
    await this.page.waitForSelector('[data-testid="dashboard"], main', { timeout: 10000 });
  }

  async navigateToEvents() {
    await this.page.click('a[href*="/events"], [data-testid="nav-events"]');
  }

  async navigateToTemplates() {
    await this.page.click('a[href*="/templates"], [data-testid="nav-templates"]');
  }

  async navigateToSettings() {
    await this.page.click('a[href*="/settings"], [data-testid="nav-settings"]');
  }
}

export class EventsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/app/events');
  }

  async waitForLoad() {
    await this.page.waitForSelector('[data-testid="events-list"], main', { timeout: 10000 });
  }

  async createNewEvent() {
    await this.page.click('a[href*="/events/new"], button:has-text("New Event"), [data-testid="create-event"]');
  }

  async clickEvent(eventName: string) {
    await this.page.click(`text=${eventName}`);
  }
}

// Utility functions for E2E tests
export async function waitForToast(page: Page, text?: string) {
  if (text) {
    await page.waitForSelector(`[data-sonner-toast]:has-text("${text}")`, { timeout: 5000 });
  } else {
    await page.waitForSelector('[data-sonner-toast]', { timeout: 5000 });
  }
}

export async function dismissToast(page: Page) {
  const toast = page.locator('[data-sonner-toast]').first();
  if (await toast.isVisible()) {
    await toast.click();
  }
}

export async function waitForLoadingToComplete(page: Page) {
  // Wait for any loading spinners to disappear
  await page.waitForSelector('[data-testid="loading"], .animate-spin', { state: 'hidden', timeout: 10000 }).catch(() => {});
}
