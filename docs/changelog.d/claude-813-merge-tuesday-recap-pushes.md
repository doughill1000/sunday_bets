- **#813** One Tuesday-morning buzz instead of two — the weekly-recap cron's two
  post-grading pushes (your record, and your league's AI recap beat) now arrive as a single
  notification per league, leading with your line and quoting the beat behind it. Both
  preference toggles and both `notification_log` ledgers stay independent, so only delivery
  merged: each concern keeps its own gate (full-week grading for results, "a recap row
  exists" for the beat), its own dedup, and its own re-send after a failed push. The merged
  push lands on `/week?season=Y&week=N` — the only screen carrying both halves — and is
  tagged per group so two leagues can't replace each other in the tray (#814). files:
  `src/lib/server/notifications.ts` · `src/lib/domain/notifications.ts` ·
  `src/routes/(app)/api/cron/weekly-recap/+server.ts`
