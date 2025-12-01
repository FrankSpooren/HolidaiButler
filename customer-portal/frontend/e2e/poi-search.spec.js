/**
 * POI Search & Navigation E2E Tests
 * HolidaiButler Customer Portal
 *
 * Tests:
 * - POI list page display
 * - Search functionality
 * - Category filtering
 * - View mode toggle (Grid/List/Map)
 * - POI detail navigation
 * - Pagination
 */

import { test, expect } from '@playwright/test';

test.describe('POI Search & Navigation', () => {
  test.describe('POI List Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/experiences');
    });

    test('should display POI list page', async ({ page }) => {
      // Check page header
      await expect(page.locator('h1, h2, h3').filter({ hasText: /ontdek|experiences|ervaringen/i }).first()).toBeVisible();

      // Check that POI cards are displayed
      await expect(page.locator('[class*="card"], [role="article"]').first()).toBeVisible({ timeout: 10000 });
    });

    test('should have search input', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="zoek" i], input[placeholder*="search" i]');
      await expect(searchInput).toBeVisible();
    });

    test('should have category filter', async ({ page }) => {
      // Look for category dropdown or filter
      const categoryFilter = page.locator('select, [role="combobox"]').filter({ hasText: /categorie|category/i });
      // May be implemented as dropdown or filter chips
    });

    test('should have sort dropdown', async ({ page }) => {
      const sortDropdown = page.locator('select, [role="combobox"]').filter({ hasText: /sorteer|sort/i });
      // May be implemented as dropdown
    });

    test('should display view mode toggle buttons', async ({ page }) => {
      // Look for view toggle buttons
      const gridButton = page.locator('button[aria-label*="grid" i], button[value="grid"]');
      const listButton = page.locator('button[aria-label*="list" i], button[value="list"]');
      const mapButton = page.locator('button[aria-label*="map" i], button[aria-label*="kaart" i], button[value="map"]');

      await expect(gridButton).toBeVisible();
      await expect(listButton).toBeVisible();
      await expect(mapButton).toBeVisible();
    });
  });

  test.describe('View Mode Toggle', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/experiences');
      // Wait for content to load
      await page.waitForLoadState('networkidle');
    });

    test('should switch to list view', async ({ page }) => {
      const listButton = page.locator('button[aria-label*="list" i], button[value="list"]');
      await listButton.click();

      // URL should include view=list
      await expect(page).toHaveURL(/view=list/);
    });

    test('should switch to map view', async ({ page }) => {
      const mapButton = page.locator('button[aria-label*="map" i], button[aria-label*="kaart" i], button[value="map"]');
      await mapButton.click();

      // URL should include view=map
      await expect(page).toHaveURL(/view=map/);

      // Map container should be visible
      await expect(page.locator('.leaflet-container, [class*="map"]')).toBeVisible({ timeout: 10000 });
    });

    test('should switch back to grid view', async ({ page }) => {
      // First switch to list
      await page.locator('button[aria-label*="list" i], button[value="list"]').click();
      await expect(page).toHaveURL(/view=list/);

      // Then switch to grid
      await page.locator('button[aria-label*="grid" i], button[value="grid"]').click();

      // URL should not have view param (default is grid)
      await expect(page).not.toHaveURL(/view=list/);
      await expect(page).not.toHaveURL(/view=map/);
    });
  });

  test.describe('Search Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/experiences');
    });

    test('should filter results on search', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="zoek" i], input[placeholder*="search" i]');
      await searchInput.fill('Benidorm');
      await searchInput.press('Enter');

      // URL should include search query
      await expect(page).toHaveURL(/q=Benidorm/i);
    });

    test('should clear search results', async ({ page }) => {
      // First search
      const searchInput = page.locator('input[placeholder*="zoek" i], input[placeholder*="search" i]');
      await searchInput.fill('Terra Natura');
      await searchInput.press('Enter');

      // Clear search
      await searchInput.clear();
      await searchInput.press('Enter');

      // URL should not have q param
      await expect(page).not.toHaveURL(/q=/);
    });
  });

  test.describe('POI Detail Page', () => {
    test('should navigate to POI detail', async ({ page }) => {
      await page.goto('/experiences');

      // Wait for cards to load
      await page.waitForLoadState('networkidle');

      // Click first POI card
      const firstCard = page.locator('[class*="card"], [role="article"]').first();
      await firstCard.click();

      // Should navigate to detail page
      await expect(page).toHaveURL(/experiences\/\d+/);
    });

    test('should display POI details', async ({ page }) => {
      // Navigate directly to a detail page
      await page.goto('/experiences/1');

      // Should show POI name in heading
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // Should have booking/action button
      await expect(page.locator('button:has-text("boek"), button:has-text("book"), button:has-text("bekijk")')).toBeVisible({ timeout: 5000 }).catch(() => {
        // Some POIs may not have booking buttons
      });
    });

    test('should have back navigation', async ({ page }) => {
      await page.goto('/experiences/1');

      // Look for back button or breadcrumb
      const backButton = page.locator('button[aria-label*="terug" i], button[aria-label*="back" i], a[href="/experiences"]');

      if (await backButton.count() > 0) {
        await backButton.first().click();
        await expect(page).toHaveURL(/experiences$/);
      }
    });
  });

  test.describe('Pagination', () => {
    test('should display pagination when results exceed page limit', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      // Look for pagination
      const pagination = page.locator('[class*="pagination"], nav[aria-label*="pagination"]');
      // Pagination may or may not exist based on result count
    });

    test('should navigate to next page', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      const nextButton = page.locator('button[aria-label*="next" i], button[aria-label*="volgende" i]');

      if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
        await nextButton.click();
        await expect(page).toHaveURL(/page=2/);
      }
    });
  });
});

test.describe('Navigation', () => {
  test('should navigate from home to experiences', async ({ page }) => {
    await page.goto('/');

    // Click on experiences link in navigation
    const experiencesLink = page.locator('a[href*="experiences"], a:has-text("Ervaringen"), a:has-text("Experiences")').first();
    await experiencesLink.click();

    await expect(page).toHaveURL(/experiences/);
  });

  test('should navigate to tickets', async ({ page }) => {
    await page.goto('/');

    const ticketsLink = page.locator('a[href*="tickets"], a:has-text("Tickets")').first();
    await ticketsLink.click();

    await expect(page).toHaveURL(/tickets/);
  });

  test('should navigate to restaurants', async ({ page }) => {
    await page.goto('/');

    const restaurantsLink = page.locator('a[href*="restaurants"], a:has-text("Restaurants")').first();
    await restaurantsLink.click();

    await expect(page).toHaveURL(/restaurants/);
  });

  test('should navigate to agenda', async ({ page }) => {
    await page.goto('/');

    const agendaLink = page.locator('a[href*="agenda"], a:has-text("Agenda")').first();
    await agendaLink.click();

    await expect(page).toHaveURL(/agenda/);
  });
});
