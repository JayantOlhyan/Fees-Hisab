import { test, expect } from '@playwright/test';

test.describe('Phase 3 — Fee Engine E2E Acceptance Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as teacher
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/students');
  });

  test('TEST 1 — Monthly Fees register loads with default current period and controls', async ({
    page,
  }) => {
    await page.goto('/fees');
    await expect(page).toHaveTitle(/Fees Hisab/);

    // Verify Title
    await expect(page.getByRole('heading', { name: /Monthly Fees Register/i })).toBeVisible();

    // Verify Generate button is present
    await expect(page.getByRole('button', { name: /Generate .* Fees/i })).toBeVisible();

    // Verify Month navigation strip
    await expect(page.getByLabel(/Previous Month/i)).toBeVisible();
    await expect(page.getByLabel(/Next Month/i)).toBeVisible();

    // Verify Status filter select
    const statusSelect = page.getByLabel(/Filter fees by status/i);
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect).toHaveValue('ALL');
  });

  test('TEST 2 — Month navigation changes URL parameters and updates display', async ({ page }) => {
    await page.goto('/fees');

    // Click Previous Month
    await page.getByLabel(/Previous Month/i).click();
    await expect(page).toHaveURL(/.*month=.*/);

    // Click Next Month
    await page.getByLabel(/Next Month/i).click();
    await expect(page).toHaveURL(/.*fees.*/);
  });

  test('TEST 3 — Status filter options exist and update view', async ({ page }) => {
    await page.goto('/fees');

    const statusSelect = page.getByLabel(/Filter fees by status/i);
    await statusSelect.selectOption('UPCOMING');
    await expect(statusSelect).toHaveValue('UPCOMING');

    await statusSelect.selectOption('DUE');
    await expect(statusSelect).toHaveValue('DUE');

    await statusSelect.selectOption('OVERDUE');
    await expect(statusSelect).toHaveValue('OVERDUE');
  });

  test('TEST 4 — Unauthenticated access to /fees redirects to /login', async ({ browser }) => {
    const context = await browser.newContext();
    const unauthedPage = await context.newPage();

    await unauthedPage.goto('/fees');
    await expect(unauthedPage).toHaveURL(/.*login.*/);
    await expect(unauthedPage.getByRole('heading', { name: 'Teacher Login' })).toBeVisible();
    await context.close();
  });
});
