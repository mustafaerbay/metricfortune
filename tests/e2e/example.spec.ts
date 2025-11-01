import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MetricFortune/);
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');

    // Check if login link exists
    const loginLink = page.getByRole('link', { name: /login|sign in/i });
    await expect(loginLink).toBeVisible();
  });
});
