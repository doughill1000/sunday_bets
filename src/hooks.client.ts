import { handleErrorWithSentry, replayIntegration } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://ade4c270d0c66931cc18605df9281926@o4510003540131840.ingest.us.sentry.io/4510003542032384',

  // Baked in at build time from VERCEL_ENV (vite.config.ts) so browser errors are
  // labeled by their real origin instead of Sentry's 'production' default. Mirrors
  // the server init in instrumentation.server.ts.
  environment: __SENTRY_ENV__,

  // Sample 10% of transactions to stay within the Sentry free-tier performance
  // quota (issue #206). Error capture is NOT governed by this — handleError still
  // reports every crash — so bug visibility is unchanged.
  tracesSampleRate: 0.1,

  // Sentry Logs is a separate quota; cron_run_log + Vercel logs already cover us,
  // so leave it off on the free tier.
  enableLogs: false,

  // Record replays only when an error occurs (0 random sessions) — spends the
  // small free-tier replay quota on sessions that actually errored, not noise.
  replaysSessionSampleRate: 0,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // If you don't want to use Session Replay, just remove the line below:
  integrations: [replayIntegration()]
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
