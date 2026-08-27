- **#858** Enabling notifications outside `/settings` now actually turns them on — a
  successful push subscribe flips the account's notification master switch instead of
  leaving a live device behind a switch that was still off, which silently muted anyone
  who took the offer from the engagement banner. files:
  `src/routes/(app)/api/push/subscribe/+server.ts` · `src/lib/domain/notifications.ts`
