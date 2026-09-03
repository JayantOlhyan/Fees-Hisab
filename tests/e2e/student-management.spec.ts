import { test, expect } from '@playwright/test';

test.describe('Phase 2 — Student Management Acceptance Workflows', () => {
  test('TEST 1 — Authenticated student login & list loads with default Active view and filters', async ({
    page,
  }) => {
    // 1. Visit login and submit
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Teacher Login' })).toBeVisible();
    await page.getByRole('button', { name: /Sign In/i }).click();

    // 2. Redirected to /students
    await expect(page).toHaveURL('/students');

    // 3. Header visible
    const heading = page.getByRole('heading', { name: 'Students', exact: true });
    await expect(heading).toBeVisible();

    // 4. Verify Active status is selected by default
    const statusSelect = page.getByLabel(/Filter by student status/i);
    await expect(statusSelect).toHaveValue('ACTIVE');

    // 5. Verify Add Student button exists
    const addBtn = page.getByRole('link', { name: /Add Student/i }).first();
    await expect(addBtn).toBeVisible();
  });

  test('TEST 2 — Form inputs and validations exist on Add Student page', async ({ page }) => {
    // Authenticate
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/students');

    // Open Add Student
    await page.goto('/students/new');
    await expect(page.getByRole('heading', { name: 'Add New Student' })).toBeVisible();

    // Required fields per Phase 2 contract
    await expect(page.getByLabel(/Student Full Name/i)).toBeVisible();
    await expect(page.getByLabel(/Monthly Fee/i)).toBeVisible();
    await expect(page.getByLabel(/Fee Due Day/i)).toBeVisible();
    await expect(page.getByLabel(/Joining Date/i)).toBeVisible();

    // Optional fields per Phase 2 contract
    await expect(page.getByLabel(/Class \/ Grade/i)).toBeVisible();
    await expect(page.getByLabel(/School Name/i)).toBeVisible();
    await expect(page.getByLabel(/Parent \/ Guardian Name/i)).toBeVisible();
    await expect(page.getByLabel(/Contact Phone/i)).toBeVisible();
    await expect(page.getByLabel(/Notes/i)).toBeVisible();

    // Submit button
    const submitBtn = page.getByRole('button', { name: /Add Student/i });
    await expect(submitBtn).toBeVisible();
  });

  test('TEST 3 — Search bar and Status filter interactions', async ({ page }) => {
    // Authenticate
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL('/students');

    const searchInput = page.getByPlaceholder(/Search by name, guardian, phone/i);
    await expect(searchInput).toBeVisible();

    // Type search
    await searchInput.fill('NonExistentStudentNameXYZ');
    // Expect empty state to be displayed on whichever viewport is active
    await expect(
      page.getByText(/No matching students found/i).locator('visible=true')
    ).toBeVisible();

    // Clear search
    await page.getByRole('button', { name: /Clear/i }).click();
    await expect(searchInput).toHaveValue('');
  });

  test('TEST 4 — Unauthenticated access to /students redirects to /login', async ({ browser }) => {
    // Isolated unauthenticated context
    const context = await browser.newContext();
    const unauthedPage = await context.newPage();

    await unauthedPage.goto('/students');
    // Should be redirected to /login
    await expect(unauthedPage).toHaveURL(/.*login.*/);
    await expect(unauthedPage.getByRole('heading', { name: 'Teacher Login' })).toBeVisible();
    await context.close();
  });
});
