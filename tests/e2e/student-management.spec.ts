import { test, expect } from '@playwright/test';

test.describe('Phase 2 — Student Management E2E Workflows', () => {
  test('TEST 1 — Navigation to Students list and Add Student page', async ({ page }) => {
    await page.goto('/students');
    await expect(page).toHaveTitle(/Fees Hisab/);

    // Header visible
    const heading = page.locator('h1');
    await expect(heading).toContainText('Students');

    // Add Student button exists and opens form
    const addBtn = page.getByRole('link', { name: /Add Student/i }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await expect(page).toHaveURL('/students/new');
    await expect(page.locator('h1')).toContainText('Add New Student');
  });

  test('TEST 2 — Form inputs and validations exist on Add Student page', async ({ page }) => {
    await page.goto('/students/new');

    await expect(page.getByLabel(/Student Full Name/i)).toBeVisible();
    await expect(page.getByLabel(/Class \/ Grade/i)).toBeVisible();
    await expect(page.getByLabel(/Monthly Fee/i)).toBeVisible();
    await expect(page.getByLabel(/Fee Due Day/i)).toBeVisible();
    await expect(page.getByLabel(/Joining Date/i)).toBeVisible();

    // Submit button
    const submitBtn = page.getByRole('button', { name: /Add Student/i });
    await expect(submitBtn).toBeVisible();
  });
});
