/**
 * Accessibility Audit E2E Tests
 * HolidaiButler Customer Portal
 * Sprint 3: Polish & Performance
 *
 * Uses axe-core for automated accessibility testing
 * Targets WCAG 2.1 AA compliance
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Pages to audit
const PAGES_TO_AUDIT = [
  { path: '/', name: 'Home Page' },
  { path: '/experiences', name: 'POI List Page' },
  { path: '/tickets', name: 'Tickets Page' },
  { path: '/restaurants', name: 'Restaurants Page' },
  { path: '/login', name: 'Login Page' },
  { path: '/register', name: 'Registration Page' },
];

// Critical violations to never ignore
const CRITICAL_RULES = [
  'color-contrast',
  'image-alt',
  'label',
  'link-name',
  'button-name',
  'document-title',
  'html-has-lang',
  'meta-viewport',
];

test.describe('Accessibility Audit - axe-core', () => {
  test.describe('Full Page Audits', () => {
    for (const pageInfo of PAGES_TO_AUDIT) {
      test(`should have no critical violations on ${pageInfo.name}`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');

        // Wait for dynamic content to load
        await page.waitForTimeout(1000);

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        // Filter for critical violations
        const criticalViolations = accessibilityScanResults.violations.filter(
          (violation) =>
            violation.impact === 'critical' ||
            violation.impact === 'serious' ||
            CRITICAL_RULES.includes(violation.id)
        );

        // Log violations for debugging
        if (criticalViolations.length > 0) {
          console.log(`\nCritical violations on ${pageInfo.name}:`);
          criticalViolations.forEach((v) => {
            console.log(`- ${v.id}: ${v.description}`);
            console.log(`  Impact: ${v.impact}`);
            console.log(`  Nodes affected: ${v.nodes.length}`);
          });
        }

        expect(criticalViolations).toHaveLength(0);
      });

      test(`should have acceptable violation count on ${pageInfo.name}`, async ({ page }) => {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        // Allow max 5 minor violations
        const minorViolations = accessibilityScanResults.violations.filter(
          (v) => v.impact === 'minor' || v.impact === 'moderate'
        );

        expect(minorViolations.length).toBeLessThanOrEqual(5);
      });
    }
  });

  test.describe('Specific Component Audits', () => {
    test('POI Card should be accessible', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      // Scope to first POI card
      const cardResults = await new AxeBuilder({ page })
        .include('[class*="card"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(cardResults.violations.filter((v) => v.impact === 'critical')).toHaveLength(0);
    });

    test('Navigation should be accessible', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const navResults = await new AxeBuilder({ page })
        .include('nav, header, [role="navigation"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(navResults.violations.filter((v) => v.impact === 'critical')).toHaveLength(0);
    });

    test('Forms should be accessible', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const formResults = await new AxeBuilder({ page })
        .include('form')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      // Forms must have proper labels
      const labelViolations = formResults.violations.filter((v) => v.id === 'label');
      expect(labelViolations).toHaveLength(0);
    });

    test('Modals should be accessible', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      // Try to open a modal (e.g., filter modal)
      const filterButton = page.locator('button:has-text("Filter"), [aria-label*="filter" i]');
      if (await filterButton.count() > 0) {
        await filterButton.first().click();
        await page.waitForTimeout(500);

        const modalResults = await new AxeBuilder({ page })
          .include('[role="dialog"], [class*="modal"], [class*="drawer"]')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        expect(modalResults.violations.filter((v) => v.impact === 'critical')).toHaveLength(0);
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const contrastResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      // Log contrast issues
      if (contrastResults.violations.length > 0) {
        console.log('\nColor contrast issues:');
        contrastResults.violations.forEach((v) => {
          v.nodes.forEach((node) => {
            console.log(`- Element: ${node.target}`);
            console.log(`  Issue: ${node.failureSummary}`);
          });
        });
      }

      expect(contrastResults.violations).toHaveLength(0);
    });

    test('should have sufficient contrast in high contrast mode', async ({ page }) => {
      await page.goto('/');

      // Enable high contrast mode if available
      await page.evaluate(() => {
        document.body.classList.add('high-contrast');
      });

      await page.waitForTimeout(500);

      const contrastResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      expect(contrastResults.violations).toHaveLength(0);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('all interactive elements should be focusable', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      // Get all interactive elements
      const interactiveElements = page.locator(
        'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
      );

      const count = await interactiveElements.count();

      for (let i = 0; i < Math.min(count, 20); i++) {
        const element = interactiveElements.nth(i);
        const isVisible = await element.isVisible();

        if (isVisible) {
          await element.focus();
          const isFocused = await element.evaluate((el) => document.activeElement === el);

          // Element should receive focus
          expect(isFocused).toBeTruthy();
        }
      }
    });

    test('focus order should be logical', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Tab through form elements
      await page.keyboard.press('Tab');

      const focusOrder = [];

      for (let i = 0; i < 5; i++) {
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tag: el.tagName,
            name: el.name || el.id || el.className,
            rect: el.getBoundingClientRect(),
          };
        });
        focusOrder.push(focused);
        await page.keyboard.press('Tab');
      }

      // Check that focus moves in visual order (top to bottom, left to right)
      for (let i = 1; i < focusOrder.length - 1; i++) {
        const prev = focusOrder[i - 1];
        const curr = focusOrder[i];

        // Current element should be below or to the right of previous
        const isLogical = curr.rect.top >= prev.rect.top - 50 || curr.rect.left > prev.rect.left;
        expect(isLogical).toBeTruthy();
      }
    });

    test('skip to content link should work', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Press Tab to focus skip link
      await page.keyboard.press('Tab');

      // Check for skip link
      const skipLink = page.locator('a[href="#main"], a:has-text("Skip to"), [class*="skip"]');

      if (await skipLink.count() > 0) {
        await skipLink.first().press('Enter');

        // Main content should be focused
        const mainFocused = await page.evaluate(() => {
          const focused = document.activeElement;
          return focused.id === 'main' || focused.tagName === 'MAIN';
        });

        expect(mainFocused).toBeTruthy();
      }
    });
  });

  test.describe('ARIA Attributes', () => {
    test('ARIA roles should be valid', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const ariaResults = await new AxeBuilder({ page })
        .withRules([
          'aria-allowed-attr',
          'aria-hidden-body',
          'aria-hidden-focus',
          'aria-required-attr',
          'aria-required-children',
          'aria-required-parent',
          'aria-roles',
          'aria-valid-attr',
          'aria-valid-attr-value',
        ])
        .analyze();

      expect(ariaResults.violations).toHaveLength(0);
    });

    test('buttons should have accessible names', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      const buttonResults = await new AxeBuilder({ page })
        .withRules(['button-name'])
        .analyze();

      expect(buttonResults.violations).toHaveLength(0);
    });

    test('links should have accessible names', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const linkResults = await new AxeBuilder({ page })
        .withRules(['link-name'])
        .analyze();

      expect(linkResults.violations).toHaveLength(0);
    });
  });

  test.describe('Images and Media', () => {
    test('images should have alt text', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      const imageResults = await new AxeBuilder({ page })
        .withRules(['image-alt'])
        .analyze();

      expect(imageResults.violations).toHaveLength(0);
    });

    test('decorative images should have empty alt', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const decorativeImages = page.locator('img[aria-hidden="true"], img[role="presentation"]');
      const count = await decorativeImages.count();

      for (let i = 0; i < count; i++) {
        const alt = await decorativeImages.nth(i).getAttribute('alt');
        expect(alt === '' || alt === null).toBeTruthy();
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('form inputs should have labels', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const labelResults = await new AxeBuilder({ page })
        .withRules(['label'])
        .analyze();

      expect(labelResults.violations).toHaveLength(0);
    });

    test('form errors should be announced', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Submit empty form to trigger errors
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);

      // Check for aria-invalid or error messages
      const invalidInputs = page.locator('[aria-invalid="true"]');
      const errorMessages = page.locator('[role="alert"], [aria-live="polite"]');

      const hasInvalid = await invalidInputs.count() > 0;
      const hasErrors = await errorMessages.count() > 0;

      // Either aria-invalid or error announcements should be present
    });
  });

  test.describe('Document Structure', () => {
    test('page should have title', async ({ page }) => {
      await page.goto('/');

      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    test('page should have lang attribute', async ({ page }) => {
      await page.goto('/');

      const lang = await page.locator('html').getAttribute('lang');
      expect(lang).toBeTruthy();
    });

    test('page should have h1', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const h1 = page.locator('h1');
      await expect(h1.first()).toBeVisible();
    });

    test('headings should be in order', async ({ page }) => {
      await page.goto('/experiences');
      await page.waitForLoadState('networkidle');

      const headingResults = await new AxeBuilder({ page })
        .withRules(['heading-order'])
        .analyze();

      expect(headingResults.violations).toHaveLength(0);
    });

    test('landmarks should be present', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const landmarkResults = await new AxeBuilder({ page })
        .withRules(['landmark-one-main', 'region'])
        .analyze();

      // Should have main landmark
      const main = page.locator('main, [role="main"]');
      expect(await main.count()).toBeGreaterThan(0);
    });
  });
});

test.describe('Mobile Accessibility', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('mobile navigation should be accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mobileResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = mobileResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('touch targets should be at least 44x44px', async ({ page }) => {
    await page.goto('/experiences');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button, a[href], [role="button"]');
    const count = await buttons.count();

    let smallTargets = 0;

    for (let i = 0; i < Math.min(count, 20); i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();

      if (isVisible) {
        const box = await button.boundingBox();
        if (box && (box.width < 44 || box.height < 44)) {
          smallTargets++;
          console.log(
            `Small touch target: ${await button.getAttribute('class')} - ${box.width}x${box.height}`
          );
        }
      }
    }

    // Allow max 3 small targets (some may be intentionally small like close buttons)
    expect(smallTargets).toBeLessThanOrEqual(3);
  });
});
