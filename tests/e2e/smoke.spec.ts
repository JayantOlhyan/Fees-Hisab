import { test, expect } from '@playwright/test';

test.describe('Fees Hisab E2E Smoke Tests', () => {
  test('home page returns successful response and contains brand name', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Fees Hisab/);
  });
});
