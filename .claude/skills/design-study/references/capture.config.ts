// THROWAWAY design-study capture config (NOT part of the committed e2e suite).
// Copy to the repo root as `playwright.capture.config.ts`, then run:
//   pnpm exec playwright test --config playwright.capture.config.ts
//
// Its own testDir (tests/capture) with no globalSetup, so it never wipes the demo
// seed the way the e2e global-setup does. Mobile viewport, dark scheme — the app's
// real target. Leave both this file and tests/capture/ untracked.
import { defineConfig } from '@playwright/test';

// :5173 is MAIN-CHECKOUT ONLY. In a worktree, change BOTH `port` here and the
// dev command's --port to a free port (e.g. 5174). See CLAUDE.md / the
// dev-server-port-check rule, and ask before starting main's server.
const port = 5173;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/capture',
  testMatch: /.*\.capture\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  reporter: [['list']],
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    // Forces the OS-level color scheme for logged-out/public pages. The app also ships
    // a light Parchment theme, per-user persisted (`users.theme_pref`, dark for unset) —
    // the seeded demo user should be left on dark so these captures stay the primary skin.
    colorScheme: 'dark'
  },
  webServer: {
    // Plain dev server reads .env.local -> the local stack that holds the demo
    // seed. reuseExistingServer so a server already on `port` is reused.
    command: `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
