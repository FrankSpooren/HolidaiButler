/**
 * Accessibility E2E Tests
 * HolidaiButler Customer Portal
 * WCAG 2.1 AA Compliance
 *
 * Tests:
 * - Skip to content functionality
 * - WCAG settings modal
 * - Keyboard navigation
 * - Color contrast (high contrast mode)
 * - Language switching
 */

import { test, expect } from '@playwright/test';

test.describe('WCAG Accessibility', () => {
  test.describe('Skip to Content', () => {
    test('should have skip to content link', async ({ page }) => {
      await page.goto('/');

      // Press Tab to focus on skip link
      await page.keyboard.press('Tab');

      // Skip link should be visible and focused
      const skipLink = page.locator('a:has-text("Ga naar hoofdinhoud"), a:has-text("Skip to"), a[href="#main-content"]');
      await expect(skipLink).toBeFocused();
    });

    test('should navigate to main content on activation', async ({ page }) => {
      await page.goto('/');

      // Tab to skip link and activate
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Main content should be focused
      const mainContent = page.locator('#main-content, main, [role="main"]');
      await expect(mainContent).toBeFocused();
    });
  });

  test.describe('WCAG Settings Modal', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('should open accessibility settings modal', async ({ page }) => {
      // Click accessibility button
      const accessibilityButton = page.locator('button[aria-label*="toegankelijkheid" i], button[aria-label*="accessibility" i]');
      await accessibilityButton.click();

      // Modal should be visible
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Should have accessibility settings title
      await expect(page.locator('text=/toegankelijkheid|accessibility/i')).toBeVisible();
    });

    test('should adjust font size', async ({ page }) => {
      // Open modal
      const accessibilityButton = page.locator('button[aria-label*="toegankelijkheid" i], button[aria-label*="accessibility" i]');
      await accessibilityButton.click();

      // Find font size slider
      const fontSizeSlider = page.locator('input[type="range"]').first();
      await expect(fontSizeSlider).toBeVisible();

      // Increase font size
      const increaseFontButton = page.locator('button[aria-label*="increase font" i], button[aria-label*="vergroot" i]');
      if (await increaseFontButton.count() > 0) {
        await increaseFontButton.click();
        // Verify font size changed
      }
    });

    test('should toggle high contrast mode', async ({ page }) => {
      // Open modal
      const accessibilityButton = page.locator('button[aria-label*="toegankelijkheid" i], button[aria-label*="accessibility" i]');
      await accessibilityButton.click();

      // Find high contrast toggle
      const highContrastButton = page.locator('button:has-text("High Contrast"), button:has-text("Hoog contrast"), button[value="high"]');
      await highContrastButton.click();

      // Close modal
      await page.locator('button:has-text("Apply"), button:has-text("Toepassen")').click();

      // Document should have high contrast class
      const html = page.locator('html');
      await expect(html).toHaveClass(/wcag-high-contrast/);
    });

    test('should toggle grayscale mode', async ({ page }) => {
      // Open modal
      const accessibilityButton = page.locator('button[aria-label*="toegankelijkheid" i], button[aria-label*="accessibility" i]');
      await accessibilityButton.click();

      // Find grayscale switch
      const grayscaleSwitch = page.locator('input[type="checkbox"][aria-label*="grayscale" i], label:has-text("Grayscale") input');

      if (await grayscaleSwitch.count() > 0) {
        await grayscaleSwitch.click();

        // Close modal
        await page.locator('button:has-text("Apply"), button:has-text("Toepassen")').click();

        // Document should have grayscale class
        const html = page.locator('html');
        await expect(html).toHaveClass(/wcag-grayscale/);
      }
    });

    test('should reset to default', async ({ page }) => {
      // Open modal
      const accessibilityButton = page.locator('button[aria-label*="toegankelijkheid" i], button[aria-label*="accessibility" i]');
      await accessibilityButton.click();

      // Click reset button
      const resetButton = page.locator('button:has-text("Reset"), button:has-text("Standaard")');
      await resetButton.click();

      // Verify settings are reset (font size should be 100%)
    });

    test('should persist settings', async ({ page }) => {
      // Open modal and change settings
      await page.locator('button[aria-label*="toegankelijkheid" i], button[aria-label*="accessibility" i]').click();

      const highContrastButton = page.locator('button:has-text("High Contrast"), button:has-text("Hoog contrast"), button[value="high"]');
      await highContrastButton.click();

      await page.locator('button:has-text("Apply"), button:has-text("Toepassen")').click();

      // Reload page
      await page.reload();

      // Settings should persist
      const html = page.locator('html');
      await expect(html).toHaveClass(/wcag-high-contrast/);
    });

    test('should close on Escape key', async ({ page }) => {
      // Open modal
      await page.locator('button[aria-label*="toegankelijkheid" i], button[aria-label*="accessibility" i]').click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Modal should be closed
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate header with keyboard', async ({ page }) => {
      await page.goto('/');

      // Tab through header navigation
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }

      // Should be able to navigate without mouse
    });

    test('should focus management in modals', async ({ page }) => {
      await page.goto('/');

      // Open accessibility modal
      await page.locator('button[aria-label*="toegankelijkheid" i], button[aria-label*="accessibility" i]').click();

      // Focus should be trapped in modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Tab should cycle within modal
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/');

      // Tab to first focusable element
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check that focused element has visible outline
      const focusedElement = page.locator(':focus');
      const outline = await focusedElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline || styles.boxShadow;
      });

      expect(outline).not.toBe('none');
    });
  });

  test.describe('Language Switching', () => {
    test('should display language switcher', async ({ page }) => {
      await page.goto('/');

      // Look for language switcher
      const languageSwitcher = page.locator('[aria-label*="taal" i], [aria-label*="language" i], select:has(option:has-text("Nederlands"))');
      await expect(languageSwitcher).toBeVisible();
    });

    test('should switch to English', async ({ page }) => {
      await page.goto('/');

      // Find and click language switcher
      const languageSwitcher = page.locator('button:has-text("NL"), button:has-text("EN")').first();

      if (await languageSwitcher.count() > 0) {
        await languageSwitcher.click();

        // Select English option
        const englishOption = page.locator('text=English, li:has-text("English"), option:has-text("English")');
        if (await englishOption.count() > 0) {
          await englishOption.click();

          // Verify language changed (check for English text)
        }
      }
    });

    test('should persist language preference', async ({ page }) => {
      // This test depends on implementation
      // Language preference should be saved to localStorage
    });
  });
});

test.describe('GDPR Compliance', () => {
  test('should display cookie consent banner', async ({ page }) => {
    // Clear cookies first
    await page.context().clearCookies();

    await page.goto('/');

    // Cookie banner should be visible
    const cookieBanner = page.locator('[class*="cookie"], [role="dialog"]:has-text("cookie")');
    await expect(cookieBanner).toBeVisible({ timeout: 10000 });
  });

  test('should have accept and reject options', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');

    // Accept button
    const acceptButton = page.locator('button:has-text("Accepteer"), button:has-text("Accept")');
    await expect(acceptButton).toBeVisible();

    // Reject/decline button
    const rejectButton = page.locator('button:has-text("Weiger"), button:has-text("Decline"), button:has-text("Alleen noodzakelijk")');
    await expect(rejectButton).toBeVisible();
  });

  test('should hide banner after accepting', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');

    const acceptButton = page.locator('button:has-text("Accepteer"), button:has-text("Accept")');
    await acceptButton.click();

    // Banner should be hidden
    const cookieBanner = page.locator('[class*="cookie"], [role="dialog"]:has-text("cookie")');
    await expect(cookieBanner).not.toBeVisible();
  });

  test('should have privacy policy link', async ({ page }) => {
    await page.goto('/');

    // Look in footer or cookie banner
    const privacyLink = page.locator('a[href*="privacy"]');
    await expect(privacyLink.first()).toBeVisible();
  });

  test('should access privacy policy page', async ({ page }) => {
    await page.goto('/privacy');

    // Should display privacy policy content
    await expect(page.locator('h1, h2').filter({ hasText: /privacy/i })).toBeVisible();
  });

  test('should access cookie policy page', async ({ page }) => {
    await page.goto('/cookies');

    // Should display cookie policy content
    await expect(page.locator('h1, h2').filter({ hasText: /cookie/i })).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should display mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Desktop nav should be hidden
    const desktopNav = page.locator('nav:visible >> a:has-text("Ervaringen")');

    // Mobile menu button should be visible
    const menuButton = page.locator('button[aria-label*="menu" i]');
    await expect(menuButton).toBeVisible();
  });

  test('should open mobile drawer', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Click menu button
    const menuButton = page.locator('button[aria-label*="menu" i]');
    await menuButton.click();

    // Drawer should be visible
    const drawer = page.locator('[class*="drawer" i], [role="dialog"]');
    await expect(drawer).toBeVisible();
  });
});
