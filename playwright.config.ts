import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load the local-stack test env (PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE, …).
// In CI these come from the job-level `env:` block instead; dotenv is a no-op
// when the file is absent and never overrides already-set process.env values.
dotenv.config({ path: '.env.test' });

// Forwarded to the app server so E2E always runs against the LOCAL Supabase
// stack — never accidentally against staging/prod from a stray .env.local.
// In CI these also reach the `pnpm build` half of the webServer command, so the
// statically-inlined $env values come from the local stack too.
const appEnv = {
  PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL ?? '',
  PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE ?? '',
  PUBLIC_ODDS_API_BASE: process.env.PUBLIC_ODDS_API_BASE ?? 'https://api.the-odds-api.com/v4',
  ODDS_API_KEY1: process.env.ODDS_API_KEY1 ?? 'e2e-unused',
  ODDS_API_KEY2: process.env.ODDS_API_KEY2 ?? 'e2e-unused',
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  // Inlined by `$env/static/private` at build time (src/lib/server/cron.ts). The
  // CI webServer runs `pnpm build`, which fails with MISSING_EXPORT if it's unset;
  // cron isn't exercised by E2E, so a dummy is fine (mirrors the ODDS keys).
  CRON_SECRET: process.env.CRON_SECRET ?? 'e2e-unused'
};

// CI runs a built `vite preview` (deterministic, no dep-optimize cold start);
// locally we use the dev server for fast feedback. Each runs on its own port so
// a stray local dev server never satisfies the CI preview's health check.
const isCI = !!process.env.CI;
// E2E_PORT lets a local run target a worktree dev server on a non-default port
// (e.g. when 5173 is held by the main checkout); falls back to the usual ports.
const port = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : isCI ? 4173 : 5173;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/e2e',

  // Seeds teams/season/active-week/game/lines into the local stack once before
  // any test runs (auth users already come from `supabase db reset`'s seed.sql).
  globalSetup: './tests/e2e/global-setup.ts',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI serves a deterministic built preview, so cold-start flake is gone; a
  // single retry only absorbs rare infra blips. Locally we allow 2 retries to
  // absorb the residual cross-spec DB contention that survives the worker cap.
  retries: isCI ? 1 : 2,
  // Cap local workers so the single `pnpm dev` server and shared Supabase stack
  // aren't thrashed by all-CPU parallelism (the source of ERR_ABORTED / detached
  // frames). 2 is the local sweet spot: at 3+ the dev server got slow enough that
  // Supabase-backed POST flows (sign-up, password reset, add-member, create-group)
  // blew their assertion timeouts. CI stays serial on its built preview.
  workers: isCI ? 1 : 2,
  // Shorter per-test cap than the 30s default for fast fail-fast on genuine
  // hangs. Sign-in-from-scratch specs raise their own budget to 25s via
  // `test.describe.configure({ timeout })`; their internal hydration waits were
  // lowered to 8s to fit inside this cap.
  timeout: 15_000,
  // `list` keeps CI logs readable; `html` is uploaded as the triage artifact.
  reporter: [['list'], ['html']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    // Logs in once via the real UI and saves the session to storageState. Kept at
    // the 30s default (a notch above the global 20s) because it does a real login
    // navigation before the suite proper; harmless headroom.
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
    // CI: build once then serve the static preview (deterministic). Local: dev
    // server for fast iteration. `--port` pins preview to the CI baseURL port.
    command: isCI ? 'pnpm build && pnpm preview --port 4173' : 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    // The CI build runs inside this command, so allow well beyond the 60s default
    // for a cold `vite build` before `vite preview` answers the health check.
    timeout: isCI ? 180_000 : 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: appEnv
  }
});
