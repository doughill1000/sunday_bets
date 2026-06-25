import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load the local-stack test env (PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE, …).
// In CI these come from the job-level `env:` block instead; dotenv is a no-op
// when the file is absent and never overrides already-set process.env values.
dotenv.config({ path: '.env.test' });

// Forwarded to the dev server so E2E always runs against the LOCAL Supabase
// stack — never accidentally against staging/prod from a stray .env.local.
const appEnv = {
  PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL ?? '',
  PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE ?? '',
  PUBLIC_ODDS_API_BASE: process.env.PUBLIC_ODDS_API_BASE ?? 'https://api.the-odds-api.com/v4',
  ODDS_API_KEY1: process.env.ODDS_API_KEY1 ?? 'e2e-unused',
  ODDS_API_KEY2: process.env.ODDS_API_KEY2 ?? 'e2e-unused',
  JWT_SECRET: process.env.JWT_SECRET ?? ''
};

export default defineConfig({
  testDir: './tests/e2e',

  // Seeds teams/season/active-week/game/lines into the local stack once before
  // any test runs (auth users already come from `supabase db reset`'s seed.sql).
  globalSetup: './tests/e2e/global-setup.ts',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Up to 2 retries in CI to absorb cold-start flake (the first Vite dep-optimize
  // reload can slow the very first navigation); 0 locally for fast feedback.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Shorter per-test cap than the 30s default. Healthy tests finish in a few
  // seconds; 20s still leaves headroom for the explicit 15s hydration waits in the
  // sign-in helpers while failing fast on a genuine hang. The `setup` project
  // overrides this because the first cold Vite dep-optimize + reload is slower.
  timeout: 20_000,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },

  projects: [
    // Logs in once via the real UI and saves the session to storageState. Gets a
    // longer timeout because the first navigation triggers Vite's cold dep-optimize
    // + full reload, which the global 20s cap could otherwise clip.
    { name: 'setup', testMatch: /.*\.setup\.ts/, timeout: 30_000 },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    }
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: appEnv
  }
});
