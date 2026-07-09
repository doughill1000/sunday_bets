import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://ade4c270d0c66931cc18605df9281926@o4510003540131840.ingest.us.sentry.io/4510003542032384',

  // Vercel sets VERCEL_ENV to 'production' | 'preview' on deployed builds; it's
  // unset locally, where events would otherwise be mislabeled 'production' by
  // Sentry's default fallback.
  environment: process.env.VERCEL_ENV ?? 'development',

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: import.meta.env.DEV,
});
