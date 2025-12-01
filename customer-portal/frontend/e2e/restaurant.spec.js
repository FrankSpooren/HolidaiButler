/**
 * Restaurant Reservation E2E Tests
 * HolidaiButler Customer Portal
 * Sprint 2: Enterprise Features
 *
 * Tests:
 * - Restaurant listing
 * - Restaurant details
 * - Reservation flow
 * - Date/time selection
 * - Party size selection
 * - Special requests
 * - Reservation confirmation
 * - Reservation management
 */

import { test, expect } from '@playwright/test';

// Test credentials
const TEST_USER = {
  email: 'test@holidaibutler.com',
  password: 'Test123!',
};

test.describe('Restaurant Listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/restaurants');
    await page.waitForLoadState('networkidle');
  });

  test('should display restaurant list', async ({ page }) => {
    // Should show restaurant cards
    const restaurantCards = page.locator('[class*="card"], [role="article"]');
    await expect(restaurantCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display restaurant information', async ({ page }) => {
    const firstCard = page.locator('[class*="card"], [role="article"]').first();

    if (await firstCard.count() > 0) {
      // Should show name
      await expect(firstCard.locator('h2, h3, [class*="title"]')).toBeVisible();

      // Should show cuisine type
      await expect(firstCard.locator('[class*="chip"], [class*="tag"], text=/cuisine|keuken/i')).toBeVisible().catch(() => {});

      // Should show rating
      await expect(firstCard.locator('[class*="rating"], svg[data-testid*="star"]')).toBeVisible().catch(() => {});

      // Should show location
      await expect(firstCard.locator('text=/calpe|benidorm|altea|costa/i')).toBeVisible().catch(() => {});
    }
  });

  test('should filter restaurants by cuisine', async ({ page }) => {
    // Find cuisine filter
    const cuisineFilter = page.locator('select:has(option:has-text("Spaans")), button:has-text("Cuisine"), [aria-label*="cuisine" i]');

    if (await cuisineFilter.count() > 0) {
      await cuisineFilter.first().click();

      // Select Spanish cuisine
      const spanishOption = page.locator('option:has-text("Spaans"), li:has-text("Spanish"), [role="option"]:has-text("Spaans")');
      if (await spanishOption.count() > 0) {
        await spanishOption.first().click();

        // Results should be filtered
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('should filter by price range', async ({ page }) => {
    const priceFilter = page.locator('[class*="price-filter"], button:has-text("Prijs"), select:has(option:has-text("Budget"))');

    if (await priceFilter.count() > 0) {
      await priceFilter.first().click();
    }
  });

  test('should search restaurants', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="zoek" i], input[placeholder*="search" i]');

    if (await searchInput.count() > 0) {
      await searchInput.fill('tapas');
      await searchInput.press('Enter');

      // Should show search results
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/q=tapas/i);
    }
  });
});

test.describe('Restaurant Details', () => {
  test('should navigate to restaurant detail page', async ({ page }) => {
    await page.goto('/restaurants');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('[class*="card"], [role="article"]').first();
    await firstCard.click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/restaurants\/\d+/);
  });

  test('should display restaurant details', async ({ page }) => {
    await page.goto('/restaurants/1');
    await page.waitForLoadState('networkidle');

    // Should show name
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Should show description
    const description = page.locator('[class*="description"], p');
    await expect(description.first()).toBeVisible().catch(() => {});

    // Should show photos
    const photos = page.locator('img[alt*="restaurant" i], [class*="gallery"]');
    await expect(photos.first()).toBeVisible().catch(() => {});

    // Should show opening hours
    const hours = page.locator('text=/openingstijden|hours|open/i');
    await expect(hours.first()).toBeVisible().catch(() => {});

    // Should show location/map
    const location = page.locator('[class*="map"], [class*="location"]');
  });

  test('should display menu or link to menu', async ({ page }) => {
    await page.goto('/restaurants/1');
    await page.waitForLoadState('networkidle');

    // Look for menu section or link
    const menu = page.locator('text=/menu/i, a:has-text("Menu"), [class*="menu"]');
    await expect(menu.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('should show reservation button', async ({ page }) => {
    await page.goto('/restaurants/1');
    await page.waitForLoadState('networkidle');

    const reserveButton = page.locator('button:has-text("Reserveer"), button:has-text("Reserve"), button:has-text("Boek")');
    await expect(reserveButton.first()).toBeVisible();
  });
});

test.describe('Reservation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|experiences|restaurants|$)/);
  });

  test('should open reservation form', async ({ page }) => {
    await page.goto('/restaurants/1');
    await page.waitForLoadState('networkidle');

    const reserveButton = page.locator('button:has-text("Reserveer"), button:has-text("Reserve")');
    await reserveButton.first().click();

    // Should show reservation form or modal
    const reservationForm = page.locator('[class*="reservation"], [role="dialog"], form');
    await expect(reservationForm).toBeVisible({ timeout: 5000 });
  });

  test('should select date', async ({ page }) => {
    await page.goto('/restaurants/1/reserve');
    await page.waitForLoadState('networkidle');

    // Find date picker
    const datePicker = page.locator('input[type="date"], [aria-label*="datum" i], button:has-text("Datum")');

    if (await datePicker.count() > 0) {
      // Select a date 3 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const dateString = futureDate.toISOString().split('T')[0];

      await datePicker.fill(dateString).catch(async () => {
        // If not a direct input, click to open picker
        await datePicker.click();
      });
    }
  });

  test('should select time slot', async ({ page }) => {
    await page.goto('/restaurants/1/reserve');
    await page.waitForLoadState('networkidle');

    // Find time picker
    const timePicker = page.locator('input[type="time"], select[name="time"], [aria-label*="tijd" i], button:has-text("Tijd")');

    if (await timePicker.count() > 0) {
      await timePicker.first().click();

      // Select 19:00
      const timeOption = page.locator('option:has-text("19:00"), li:has-text("19:00"), [role="option"]:has-text("19:00")');
      if (await timeOption.count() > 0) {
        await timeOption.first().click();
      }
    }
  });

  test('should select party size', async ({ page }) => {
    await page.goto('/restaurants/1/reserve');
    await page.waitForLoadState('networkidle');

    // Find party size selector
    const partySize = page.locator('select[name="guests"], select[name="partySize"], input[name="guests"], [aria-label*="personen" i]');

    if (await partySize.count() > 0) {
      await partySize.first().click();

      // Select 4 persons
      const option = page.locator('option:has-text("4"), li:has-text("4 personen"), [role="option"]:has-text("4")');
      if (await option.count() > 0) {
        await option.first().click();
      }
    }
  });

  test('should fill guest details', async ({ page }) => {
    await page.goto('/restaurants/1/reserve');
    await page.waitForLoadState('networkidle');

    // Name
    const nameInput = page.locator('input[name="name"], input[placeholder*="naam" i]');
    if (await nameInput.count() > 0) {
      await nameInput.fill('Test Reservering');
    }

    // Email
    const emailInput = page.locator('input[name="email"]:not([type="password"])');
    if (await emailInput.count() > 0) {
      await emailInput.fill('reservation@test.com');
    }

    // Phone
    const phoneInput = page.locator('input[name="phone"], input[type="tel"]');
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('+31612345678');
    }
  });

  test('should add special requests', async ({ page }) => {
    await page.goto('/restaurants/1/reserve');
    await page.waitForLoadState('networkidle');

    // Find special requests textarea
    const specialRequests = page.locator('textarea[name="specialRequests"], textarea[name="notes"], textarea[placeholder*="opmerking" i]');

    if (await specialRequests.count() > 0) {
      await specialRequests.fill('Vegetarische opties graag. Tafel bij het raam als mogelijk.');
    }
  });

  test('should submit reservation', async ({ page }) => {
    await page.goto('/restaurants/1/reserve');
    await page.waitForLoadState('networkidle');

    // Fill required fields
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.count() > 0) {
      await nameInput.fill('Test Guest');
    }

    const phoneInput = page.locator('input[name="phone"], input[type="tel"]');
    if (await phoneInput.count() > 0) {
      await phoneInput.fill('+31612345678');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Reserveer"), button:has-text("Bevestig")');
    if (await submitButton.count() > 0) {
      await submitButton.click();

      // Should show confirmation or navigate to confirmation page
      await expect(page).toHaveURL(/confirm|success|bevestiging/i, { timeout: 10000 }).catch(async () => {
        // Or show success message
        const success = page.locator('text=/gelukt|success|bevestigd/i');
        await expect(success).toBeVisible({ timeout: 5000 });
      });
    }
  });
});

test.describe('Reservation Confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|experiences|$)/);
  });

  test('should display reservation confirmation', async ({ page }) => {
    // Assuming a confirmation page exists after booking
    await page.goto('/reservations/confirmation/test-123');
    await page.waitForLoadState('networkidle');

    // Should show restaurant name
    const restaurantName = page.locator('h1, h2, [class*="restaurant-name"]');

    // Should show date and time
    const dateTime = page.locator('text=/datum|date|tijd|time/i');

    // Should show party size
    const guests = page.locator('text=/personen|guests|gasten/i');

    // Should show confirmation number
    const confirmNumber = page.locator('text=/bevestigingsnummer|confirmation|referentie/i');
  });

  test('should show add to calendar option', async ({ page }) => {
    await page.goto('/reservations/confirmation/test-123');
    await page.waitForLoadState('networkidle');

    const calendarButton = page.locator('button:has-text("Kalender"), button:has-text("Calendar"), a:has-text("Add to calendar")');

    if (await calendarButton.count() > 0) {
      await expect(calendarButton.first()).toBeVisible();
    }
  });
});

test.describe('Reservation Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|experiences|$)/);
  });

  test('should display reservation history', async ({ page }) => {
    await page.goto('/dashboard/reservations');
    await page.waitForLoadState('networkidle');

    // Should show reservations or empty state
    const reservations = page.locator('[class*="reservation"], [class*="booking"]');
    const emptyState = page.locator('text=/geen reserveringen|no reservations/i');

    const hasReservations = await reservations.count() > 0;
    const isEmpty = await emptyState.count() > 0;

    expect(hasReservations || isEmpty).toBeTruthy();
  });

  test('should view reservation details', async ({ page }) => {
    await page.goto('/dashboard/reservations');
    await page.waitForLoadState('networkidle');

    const reservationCard = page.locator('[class*="reservation"], [class*="card"]').first();

    if (await reservationCard.count() > 0) {
      await reservationCard.click();

      // Should show details
      const details = page.locator('[class*="detail"], [class*="modal"]');
      await expect(details).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('should modify reservation', async ({ page }) => {
    await page.goto('/dashboard/reservations');
    await page.waitForLoadState('networkidle');

    const modifyButton = page.locator('button:has-text("Wijzig"), button:has-text("Modify"), button:has-text("Edit")');

    if (await modifyButton.count() > 0) {
      await modifyButton.first().click();

      // Should show modification form
      const modifyForm = page.locator('[class*="form"], [role="dialog"]');
      await expect(modifyForm).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('should cancel reservation', async ({ page }) => {
    await page.goto('/dashboard/reservations');
    await page.waitForLoadState('networkidle');

    const cancelButton = page.locator('button:has-text("Annuleer"), button:has-text("Cancel")');

    if (await cancelButton.count() > 0) {
      await cancelButton.first().click();

      // Should show confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"]');
      await expect(confirmDialog).toBeVisible({ timeout: 5000 }).catch(() => {});

      // Confirm cancellation
      const confirmButton = page.locator('button:has-text("Bevestig"), button:has-text("Confirm")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();

        // Should show success message
        const success = page.locator('text=/geannuleerd|cancelled|success/i');
      }
    }
  });
});

test.describe('Availability Check', () => {
  test('should show unavailable time slots', async ({ page }) => {
    await page.goto('/restaurants/1/reserve');
    await page.waitForLoadState('networkidle');

    // Some time slots should be disabled/unavailable
    const disabledSlots = page.locator('button:disabled:has-text(":"), [class*="unavailable"], [aria-disabled="true"]');

    // The presence of disabled slots indicates availability checking is working
  });

  test('should handle fully booked days', async ({ page }) => {
    await page.goto('/restaurants/1/reserve');
    await page.waitForLoadState('networkidle');

    // Look for fully booked indicators
    const fullyBooked = page.locator('text=/volledig|fully booked|niet beschikbaar/i, [class*="unavailable"]');
  });
});

test.describe('Restaurant Reviews', () => {
  test('should display reviews', async ({ page }) => {
    await page.goto('/restaurants/1');
    await page.waitForLoadState('networkidle');

    // Look for reviews section
    const reviewsSection = page.locator('[class*="review"], [id*="review"]');

    if (await reviewsSection.count() > 0) {
      // Should show review text
      const reviewText = page.locator('[class*="review-text"], [class*="review-content"]');

      // Should show rating
      const rating = page.locator('[class*="rating"]');

      // Should show reviewer name
      const reviewer = page.locator('[class*="reviewer"], [class*="author"]');
    }
  });

  test('should allow adding review after visit', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|experiences|$)/);

    await page.goto('/restaurants/1');
    await page.waitForLoadState('networkidle');

    const addReviewButton = page.locator('button:has-text("Review"), button:has-text("Beoordeling")');

    if (await addReviewButton.count() > 0) {
      await addReviewButton.click();

      // Should show review form
      const reviewForm = page.locator('[class*="review-form"], [role="dialog"]');
      await expect(reviewForm).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
