- **#674** Restore the PWA install/notification banner to in-flow rendering — split
  the install decision (synchronous) from the notification decision (awaits push
  subscription state) so the banner no longer needs to float as a fixed overlay to
  avoid layout shift. files: `src/lib/pwa/engagement.ts` ·
  `src/lib/components/pwa/EngagementBanner.svelte`
