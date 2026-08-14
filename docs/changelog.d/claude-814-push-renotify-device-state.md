- **#814** Push notifications alert again instead of arriving silently. Notifications are
  coalesced by tag so repeat alerts about the same thing replace each other rather than
  stacking — but a replacement updates the tray entry **without** re-alerting unless the
  handler says otherwise, so in practice only the first push per tag ever made a sound.
  Coalescing stays; the missing half is now set alongside it. The `/settings` Notifications
  card also stops reporting an account-level flag as if it were this device: it reconciles
  the account switch against whether this device actually holds a subscription, so a device
  that lost one (reinstalled app, cleared data) says so and offers a one-tap fix instead of a
  "Disable" button implying everything works. files: `static/push-handler.js` ·
  `src/lib/push/state.ts` · `src/routes/(app)/settings/+page.svelte`
