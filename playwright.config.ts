import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Look for test files in the "tests/e2e" directory, relative to this configuration file.
  testDir: './tests/e2e',

  // The base URL to use in actions like `await page.goto('/')`.
  // This is configured in the webServer block below.
  baseURL: 'http://localhost:5173',

  // Run your local dev server before starting the tests.
  webServer: {
    // The command to start your SvelteKit app from the project root.
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe'
  },

  // Other recommended settings...
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});