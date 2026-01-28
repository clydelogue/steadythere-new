import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  test('unauthenticated users redirected to auth', async ({ page }) => {
    await page.goto('/');
    // Should redirect to /auth if not authenticated
    await expect(page).toHaveURL('/auth');
  });

  test('auth page loads', async ({ page }) => {
    await page.goto('/auth');
    // Auth page should be accessible
    await expect(page).toHaveURL('/auth');
  });
});
