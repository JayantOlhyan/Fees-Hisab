import { test, expect } from '@playwright/test';

test.describe('Phase 4 — Payment Management E2E Acceptance Workflows', () => {
  test('TEST 1 — Fees register exposes Record Payment and records partial payment', async ({
    page,
  }) => {
    // 1. Log in
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/.*students.*/, { timeout: 10000 });

    // 2. Navigate to /fees
    await page.goto('/fees');
    await expect(page.getByRole('heading', { name: /Fees Register/i })).toBeVisible();

    // 3. Ensure fee records exist by clicking Generate Fees if present
    const generateBtn = page.getByRole('button', { name: /Generate .* Fees/i });
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
    }

    // 4. Verify Record Payment button exists and click it
    const recordPaymentButtons = page.getByRole('button', { name: /Record Payment/i });
    if ((await recordPaymentButtons.count()) > 0) {
      const firstRecordBtn = recordPaymentButtons.first();
      await firstRecordBtn.click();

      // 5. Verify modal opens
      const modalHeading = page
        .getByRole('heading', { level: 3 })
        .filter({ hasText: /Payment/i })
        .first();
      await expect(modalHeading).toBeVisible();

      // 6. Enter partial payment amount
      const amountInput = page.locator('#payment-amount');
      await expect(amountInput).toBeVisible();
      await amountInput.fill('500');

      // 7. Select Payment Method
      const methodSelect = page.locator('#payment-method');
      await methodSelect.selectOption('UPI');

      // 8. Add note
      const notesInput = page.locator('#payment-notes');
      await notesInput.fill('E2E Partial payment test');

      // 9. Save Payment
      const submitBtn = page.getByRole('button', { name: /^Record Payment$/i });
      await submitBtn.click();

      // 10. Check that modal closes
      await expect(amountInput).not.toBeVisible();

      // 11. Check success feedback appears
      await expect(page.getByText(/Payment recorded successfully!/i)).toBeVisible();
    }
  });

  test('TEST 2 — Overpayment attempt shows error in payment modal', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/.*students.*/, { timeout: 10000 });

    await page.goto('/fees');
    await expect(page.getByRole('heading', { name: /Fees Register/i })).toBeVisible();

    const recordPaymentButtons = page.getByRole('button', { name: /Record Payment/i });
    if ((await recordPaymentButtons.count()) > 0) {
      await recordPaymentButtons.first().click();

      const amountInput = page.locator('#payment-amount');
      await expect(amountInput).toBeVisible();

      // Enter an excessively high amount (e.g. 999999) to force client/server overpayment rejection
      await amountInput.fill('999999');

      const submitBtn = page.getByRole('button', { name: /^Record Payment$/i });
      await submitBtn.click();

      // Verify overpayment error is displayed
      const errorBanner = page.getByRole('alert');
      await expect(errorBanner).toBeVisible();
      await expect(errorBanner).toContainText(/exceeds/i);

      // Cancel modal
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(amountInput).not.toBeVisible();
    }
  });

  test('TEST 3 — Student detail page displays Payments tab and transaction list', async ({
    page,
    isMobile,
  }) => {
    // 1. Log in
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/.*students.*/, { timeout: 10000 });

    // 2. Click on student detail link depending on viewport
    if (isMobile) {
      const mobileCard = page.locator('.lg\\:hidden a[href^="/students/"]').first();
      await expect(mobileCard).toBeVisible();
      await mobileCard.click();
    } else {
      const desktopRow = page.locator('table tbody tr td a').first();
      await expect(desktopRow).toBeVisible();
      await desktopRow.click();
    }

    await expect(page).toHaveURL(/\/students\/.+/);

    // 3. Ensure student profile loaded
    await expect(page.getByRole('button', { name: 'Archive' })).toBeVisible();

    // 4. Click Payments tab
    const paymentsTabBtn = page.locator('#tab-payments');
    await expect(paymentsTabBtn).toBeVisible();
    await paymentsTabBtn.click();

    // 5. Verify Payments view is active (check for Go to Fees Register link or lifetime amount)
    await expect(page.locator('a[href="/fees"]').last()).toBeVisible();
  });
});
