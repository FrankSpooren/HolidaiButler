import { test, expect } from '@playwright/test';

test.describe('Chatbot Widget', () => {
  test('chatbot bubble is visible on homepage', async ({ page }) => {
    await page.goto('/');
    const bubble = page.locator(
      '[data-testid="chatbot-bubble"], [data-testid="chatbot-toggle"], button[aria-label*="chat" i], .chatbot-bubble, .chat-bubble'
    );
    await expect(bubble.first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking bubble opens chatbot panel', async ({ page }) => {
    await page.goto('/');
    const bubble = page.locator(
      '[data-testid="chatbot-bubble"], [data-testid="chatbot-toggle"], button[aria-label*="chat" i], .chatbot-bubble, .chat-bubble'
    ).first();
    await bubble.click();
    // Chat panel should be visible after click
    const panel = page.locator(
      '[data-testid="chatbot-panel"], [data-testid="chatbot-container"], .chatbot-panel, .chat-panel, .chatbot-container'
    );
    await expect(panel.first()).toBeVisible({ timeout: 5000 });
  });

  test('chatbot shows quick actions or welcome message', async ({ page }) => {
    await page.goto('/');
    const bubble = page.locator(
      '[data-testid="chatbot-bubble"], [data-testid="chatbot-toggle"], button[aria-label*="chat" i], .chatbot-bubble, .chat-bubble'
    ).first();
    await bubble.click();
    await page.waitForTimeout(1000);
    // Look for quick action buttons or welcome text
    const content = page.locator(
      '[data-testid="quick-action"], .quick-action, .welcome-message, .chat-message, button:has-text("restaurant"), button:has-text("beach"), button:has-text("strand")'
    );
    const count = await content.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('chatbot has a text input field', async ({ page }) => {
    await page.goto('/');
    const bubble = page.locator(
      '[data-testid="chatbot-bubble"], [data-testid="chatbot-toggle"], button[aria-label*="chat" i], .chatbot-bubble, .chat-bubble'
    ).first();
    await bubble.click();
    const input = page.locator(
      '[data-testid="chatbot-input"], .chatbot-input, input[placeholder*="message" i], input[placeholder*="vraag" i], input[placeholder*="type" i], textarea'
    );
    await expect(input.first()).toBeVisible({ timeout: 5000 });
  });

  test('can type a message in the chatbot', async ({ page }) => {
    await page.goto('/');
    const bubble = page.locator(
      '[data-testid="chatbot-bubble"], [data-testid="chatbot-toggle"], button[aria-label*="chat" i], .chatbot-bubble, .chat-bubble'
    ).first();
    await bubble.click();
    const input = page.locator(
      '[data-testid="chatbot-input"], .chatbot-input, input[placeholder*="message" i], input[placeholder*="vraag" i], input[placeholder*="type" i], textarea'
    ).first();
    await input.fill('Hello');
    const value = await input.inputValue();
    expect(value).toBe('Hello');
  });
});
