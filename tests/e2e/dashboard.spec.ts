import { test, expect } from '@playwright/test';

test.describe('Phase 5 — Dashboard E2E Acceptance Workflows', () => {
  test('TEST 1 — Unauthenticated access to / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('TEST 2 — Authenticated dashboard loads with current period and primary stat cards', async ({
    page,
  }) => {
    // 1. Authenticate via login
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/.*students.*/, { timeout: 10000 });

    // 2. Navigate to Dashboard route /
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

    // 3. Verify primary stat cards
    await expect(page.getByText('Active Students')).toBeVisible();
    await expect(page.getByText('Collected This Month')).toBeVisible();
    await expect(page.getByText('Outstanding')).toBeVisible();
    await expect(page.getByText('Overdue')).toBeVisible();

    // 4. Verify Status Overview Strip
    await expect(page.getByText('This Month Overview')).toBeVisible();
    await expect(page.getByText('Fully Paid')).toBeVisible();
    await expect(page.getByText('Partially Paid')).toBeVisible();
  });

  test('TEST 3 — Needs Attention section or Fee Generation CTA is visible on dashboard', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/.*students.*/, { timeout: 10000 });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

    // If fees are not generated yet for current month, click Generate Fees button
    const generateBtn = page.getByRole('button', { name: /Generate .* Fees/i });
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(1000);
    }

    // Needs Attention section should now be visible
    await expect(page.getByRole('heading', { name: /Needs Attention/i })).toBeVisible();

    const recordFeeBtns = page.getByRole('button', { name: /Record Fee/i });
    if ((await recordFeeBtns.count()) > 0) {
      await recordFeeBtns.first().click();

      // Verify payment modal opens
      const modalHeading = page
        .getByRole('heading', { level: 3 })
        .filter({ hasText: /Payment/i })
        .first();
      await expect(modalHeading).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: 'Cancel' }).click();
    }
  });

  test('TEST 4 — Quick Actions navigate to expected routes', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/.*students.*/, { timeout: 10000 });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();

    // Ensure fees exist so Quick Actions section renders below dashboard items
    const generateBtn = page.getByRole('button', { name: /Generate .* Fees/i });
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(1000);
    }

    // Quick Action: View Fees
    const viewFeesLink = page.getByRole('link', { name: /View Fees/i }).first();
    await expect(viewFeesLink).toBeVisible();
    await viewFeesLink.click();
    await expect(page).toHaveURL(/\/fees/);

    // Navigate back to Dashboard
    await page.goto('/');

    // Quick Action: Manage Students
    const manageStudentsLink = page.getByRole('link', { name: /Manage Students/i });
    await expect(manageStudentsLink).toBeVisible();
    await manageStudentsLink.click();
    await expect(page).toHaveURL(/\/students/);
  });
});
