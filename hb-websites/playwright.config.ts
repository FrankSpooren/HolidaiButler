import { defineConfig, devices } from '@playwright/test';

const CALPE_URL = process.env.CALPE_URL ?? 'https://dev.holidaibutler.com';
const TEXEL_URL = process.env.TEXEL_URL ?? 'https://dev.texelmaps.nl';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'calpe-desktop',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: CALPE_URL,
      },
    },
    {
      name: 'texel-desktop',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: TEXEL_URL,
      },
    },
    {
      name: 'calpe-mobile',
      use: {
        ...devices['iPhone 14'],
        baseURL: CALPE_URL,
      },
    },
  ],
});
