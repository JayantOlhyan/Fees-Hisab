import { test, expect } from '@playwright/test';

test.describe('Phase 2 — Student Management Acceptance Workflows', () => {
  test('TEST 1 — Authenticated student login & list loads with default Active view and filters', async ({
    page,
  }) => {
    // 1. Visit /login and perform one-click sign in
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // 2. Redirected to /students
    await expect(page).toHaveURL('/students');

    // 3. Header visible
    const heading = page.getByRole('heading', { name: 'Students', exact: true });
    await expect(heading).toBeVisible();

    // 4. Status filter exists and defaults to Active
    const statusSelect = page.getByLabel('Filter by student status');
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect).toHaveValue('ACTIVE');

    // 5. Add student button exists
    const addBtn = page.getByRole('link', { name: /Add/i });
    await expect(addBtn).toBeVisible();
  });

  test('TEST 2 — Form inputs and validations exist on Add Student page', async ({ page }) => {
    // Authenticate
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/students');

    // Navigate to Add Student
    await page.goto('/students/new');
    await expect(page.getByRole('heading', { name: /Add New Student/i })).toBeVisible();

    // Contract: Required inputs
    await expect(page.locator('#student-name')).toBeVisible();
    await expect(page.locator('#student-fee')).toBeVisible();
    await expect(page.locator('#student-due-day')).toBeVisible();
    await expect(page.locator('#student-joining-date')).toBeVisible();

    // Contract: Optional inputs
    await expect(page.locator('#student-class')).toBeVisible();
    await expect(page.locator('#student-guardian')).toBeVisible();
    await expect(page.locator('#student-phone')).toBeVisible();
    await expect(page.locator('#student-school')).toBeVisible();

    // Submit button
    const submitBtn = page.getByRole('button', { name: /Add Student/i });
    await expect(submitBtn).toBeVisible();
  });

  test('TEST 3 — Search bar and Status filter interactions', async ({ page }) => {
    // Authenticate
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/students');

    const searchInput = page.getByLabel('Search students');
    await expect(searchInput).toBeVisible();

    // Status filter options check
    const statusSelect = page.getByLabel('Filter by student status');
    await statusSelect.selectOption('ALL');
    await expect(statusSelect).toHaveValue('ALL');

    await statusSelect.selectOption('ACTIVE');
    await expect(statusSelect).toHaveValue('ACTIVE');
  });

  test('TEST 4 — Unauthenticated access to /students redirects to /login', async ({ browser }) => {
    // Isolated unauthenticated context
    const context = await browser.newContext();
    const unauthedPage = await context.newPage();

    await unauthedPage.goto('/students');
    await expect(unauthedPage).toHaveURL(/.*login.*/);
    await expect(unauthedPage.getByRole('heading', { name: 'Teacher Login' })).toBeVisible();
    await context.close();
  });
});
