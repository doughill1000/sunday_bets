import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://ade4c270d0c66931cc18605df9281926@o4510003540131840.ingest.us.sentry.io/4510003542032384',

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: import.meta.env.DEV,
});