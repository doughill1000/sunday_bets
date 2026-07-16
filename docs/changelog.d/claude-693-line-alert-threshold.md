- **#693** Trim line-movement alerts — dropped the per-user points-threshold knob from
  `/settings`; the alert now fires on a single fixed move so the room keeps the signal
  without a bettor's configuration surface. files: `src/lib/domain/notifications.ts` ·
  `src/lib/server/notifications.ts` · `src/routes/(app)/settings/+page.svelte`
