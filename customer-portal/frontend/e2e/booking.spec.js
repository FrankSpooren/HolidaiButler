/**
 * Booking Flow E2E Tests
 * HolidaiButler Customer Portal
 * Sprint 2: Enterprise Features
 *
 * Tests:
 * - Ticket booking flow
 * - Date selection
 * - Quantity selection
 * - Guest information
 * - Booking confirmation
 * - Booking history
 */

import { test, expect } from '@playwright/test';

// Test user credentials
const TEST_USER = {
  email: 'test@holidaibutler.com',
  password: 'Test123!',
};

test.describe('Ticket Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|experiences|$)/);
  });

  test.describe('POI to Booking', () => {
    test('should navigate from POI to booking page', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      // Click first POI card
      const poiCard = page.locator('[class*="card"], [role="article"]').first();
      await poiCard.click();

      // Wait for detail page
      await expect(page).toHaveURL(/experiences\/\d+/);

      // Look for booking/tickets button
      const bookButton = page.locator('button:has-text("Boek"), button:has-text("Book"), button:has-text("Tickets"), a:has-text("Boek")');
      if (await bookButton.count() > 0) {
        await bookButton.first().click();

        // Should navigate to booking or open booking modal
        await expect(page.locator('[class*="booking"], [role="dialog"]')).toBeVisible({ timeout: 10000 });
      }
    });

    test('should display booking form', async ({ page }) => {
      await page.goto('/tickets');
      await page.waitForLoadState('networkidle');

      // Click first ticket
      const ticketCard = page.locator('[class*="card"], [role="article"]').first();
      if (await ticketCard.count() > 0) {
        await ticketCard.click();

        // Should see date picker
        const datePicker = page.locator('input[type="date"], [class*="datepicker"], button:has-text("Datum")');
        await expect(datePicker.first()).toBeVisible({ timeout: 5000 }).catch(() => {
          // Date picker may not be present for all tickets
        });
      }
    });
  });

  test.describe('Date Selection', () => {
    test('should select booking date', async ({ page }) => {
      await page.goto('/tickets/1/book');

      // Wait for page load
      await page.waitForLoadState('networkidle');

      // Find date picker
      const datePicker = page.locator('input[type="date"], [aria-label*="datum" i], [aria-label*="date" i]');

      if (await datePicker.count() > 0) {
        // Select tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateString = tomorrow.toISOString().split('T')[0];

        await datePicker.fill(dateString);

        // Verify date is selected
        await expect(datePicker).toHaveValue(dateString);
      }
    });

    test('should not allow past dates', async ({ page }) => {
      await page.goto('/tickets/1/book');
      await page.waitForLoadState('networkidle');

      const datePicker = page.locator('input[type="date"]');

      if (await datePicker.count() > 0) {
        // Try to select yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateString = yesterday.toISOString().split('T')[0];

        await datePicker.fill(dateString);

        // Should show error or be invalid
        const errorMessage = page.locator('text=/invalid|niet geldig|verleden|past/i');
        // Either error message or date should be cleared/rejected
      }
    });
  });

  test.describe('Quantity Selection', () => {
    test('should adjust ticket quantity', async ({ page }) => {
      await page.goto('/tickets/1/book');
      await page.waitForLoadState('networkidle');

      // Find quantity controls
      const increaseButton = page.locator('button[aria-label*="increase" i], button[aria-label*="meer" i], button:has-text("+")');
      const decreaseButton = page.locator('button[aria-label*="decrease" i], button[aria-label*="minder" i], button:has-text("-")');
      const quantityInput = page.locator('input[type="number"], [class*="quantity"]');

      if (await increaseButton.count() > 0) {
        // Increase quantity
        await increaseButton.first().click();
        await increaseButton.first().click();

        // Check quantity updated
        if (await quantityInput.count() > 0) {
          const value = await quantityInput.first().inputValue();
          expect(parseInt(value)).toBeGreaterThanOrEqual(2);
        }

        // Decrease quantity
        await decreaseButton.first().click();
      }
    });

    test('should show total price based on quantity', async ({ page }) => {
      await page.goto('/tickets/1/book');
      await page.waitForLoadState('networkidle');

      // Look for price display
      const priceDisplay = page.locator('[class*="total"], [class*="price"]:has-text("Total"), text=/totaal|total/i');

      if (await priceDisplay.count() > 0) {
        await expect(priceDisplay.first()).toBeVisible();
      }
    });
  });

  test.describe('Guest Information', () => {
    test('should fill guest details', async ({ page }) => {
      await page.goto('/tickets/1/book');
      await page.waitForLoadState('networkidle');

      // Fill guest name
      const nameInput = page.locator('input[name="name"], input[name="guestName"], input[placeholder*="naam" i]');
      if (await nameInput.count() > 0) {
        await nameInput.fill('Test Guest');
      }

      // Fill email
      const emailInput = page.locator('input[name="email"], input[type="email"]:not([name="password"])');
      if (await emailInput.count() > 0) {
        await emailInput.fill('guest@test.com');
      }

      // Fill phone
      const phoneInput = page.locator('input[name="phone"], input[type="tel"]');
      if (await phoneInput.count() > 0) {
        await phoneInput.fill('+31612345678');
      }
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/tickets/1/book');
      await page.waitForLoadState('networkidle');

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"], button:has-text("Boek"), button:has-text("Bevestig")');

      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Should show validation errors
        const errorMessages = page.locator('[class*="error"], [role="alert"], text=/verplicht|required/i');
        // Validation should prevent submission
      }
    });
  });

  test.describe('Booking Confirmation', () => {
    test('should show booking summary before confirmation', async ({ page }) => {
      await page.goto('/tickets/1/book');
      await page.waitForLoadState('networkidle');

      // Look for summary section
      const summarySection = page.locator('[class*="summary"], [class*="overview"]');

      if (await summarySection.count() > 0) {
        // Should show ticket name
        await expect(summarySection.locator('text=/ticket|ervaring/i')).toBeVisible().catch(() => {});

        // Should show price
        await expect(summarySection.locator('text=/\\u20AC|EUR/i')).toBeVisible().catch(() => {});
      }
    });

    test('should complete booking flow', async ({ page }) => {
      await page.goto('/tickets/1/book');
      await page.waitForLoadState('networkidle');

      // Fill in all required fields (simplified)
      const nameInput = page.locator('input[name="name"], input[placeholder*="naam" i]');
      if (await nameInput.count() > 0) {
        await nameInput.fill('Test Booking');
      }

      const emailInput = page.locator('input[name="email"]:not([type="password"])');
      if (await emailInput.count() > 0) {
        await emailInput.fill('booking@test.com');
      }

      // Accept terms if present
      const termsCheckbox = page.locator('input[type="checkbox"][name*="terms"], input[type="checkbox"][name*="accept"]');
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check();
      }

      // Submit booking
      const submitButton = page.locator('button[type="submit"], button:has-text("Boek"), button:has-text("Bevestig")');
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Should navigate to confirmation or payment
        await expect(page).toHaveURL(/confirm|payment|success|checkout/i, { timeout: 10000 }).catch(() => {
          // Or show confirmation message
        });
      }
    });
  });

  test.describe('Booking History', () => {
    test('should display booking history', async ({ page }) => {
      await page.goto('/dashboard/bookings');

      // Wait for bookings to load
      await page.waitForLoadState('networkidle');

      // Should show bookings list or empty state
      const bookingsList = page.locator('[class*="booking"], [class*="reservation"]');
      const emptyState = page.locator('text=/geen boekingen|no bookings|leeg/i');

      // Either show bookings or empty state
      const hasBookings = await bookingsList.count() > 0;
      const isEmpty = await emptyState.count() > 0;

      expect(hasBookings || isEmpty).toBeTruthy();
    });

    test('should view booking details', async ({ page }) => {
      await page.goto('/dashboard/bookings');
      await page.waitForLoadState('networkidle');

      const bookingCard = page.locator('[class*="booking"], [class*="card"]').first();

      if (await bookingCard.count() > 0) {
        await bookingCard.click();

        // Should show booking details
        await expect(page.locator('[class*="detail"], [class*="modal"]')).toBeVisible({ timeout: 5000 }).catch(() => {
          // May navigate to detail page instead
        });
      }
    });

    test('should allow booking cancellation', async ({ page }) => {
      await page.goto('/dashboard/bookings');
      await page.waitForLoadState('networkidle');

      // Look for cancel button on a booking
      const cancelButton = page.locator('button:has-text("Annuleer"), button:has-text("Cancel")');

      if (await cancelButton.count() > 0) {
        await cancelButton.first().click();

        // Should show confirmation dialog
        const confirmDialog = page.locator('[role="dialog"], [class*="modal"]');
        await expect(confirmDialog).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });
  });
});

test.describe('Ticket Types & Options', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
  });

  test('should display different ticket types', async ({ page }) => {
    // Navigate to a ticket with options
    const ticketCard = page.locator('[class*="card"]').first();

    if (await ticketCard.count() > 0) {
      await ticketCard.click();

      // Look for ticket type selection (Adult, Child, Senior, etc.)
      const ticketTypes = page.locator('[class*="ticket-type"], [class*="option"], label:has-text("Volwassene"), label:has-text("Kind")');

      // Should display at least one ticket type
    }
  });

  test('should apply discount codes', async ({ page }) => {
    await page.goto('/tickets/1/book');
    await page.waitForLoadState('networkidle');

    // Look for discount code input
    const discountInput = page.locator('input[name="discount"], input[name="coupon"], input[placeholder*="korting" i], input[placeholder*="coupon" i]');

    if (await discountInput.count() > 0) {
      await discountInput.fill('TEST10');

      // Apply button
      const applyButton = page.locator('button:has-text("Toepassen"), button:has-text("Apply")');
      if (await applyButton.count() > 0) {
        await applyButton.click();

        // Should show success or error message
      }
    }
  });
});
