import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    // The landing page should be accessible
    await expect(page).toHaveURL('/');
  });

  test('unauthenticated users redirected to login from app routes', async ({ page }) => {
    await page.goto('/app');
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/\/(login|auth)/);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    // Login page should be accessible
    await expect(page).toHaveURL('/login');
  });
});
