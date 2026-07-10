import { handleErrorWithSentry, replayIntegration } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://ade4c270d0c66931cc18605df9281926@o4510003540131840.ingest.us.sentry.io/4510003542032384',

  // Baked in at build time from VERCEL_ENV (vite.config.ts) so browser errors are
  // labeled by their real origin instead of Sentry's 'production' default. Mirrors
  // the server init in instrumentation.server.ts.
  environment: __SENTRY_ENV__,

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // If you don't want to use Session Replay, just remove the line below:
  integrations: [replayIntegration()]
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
