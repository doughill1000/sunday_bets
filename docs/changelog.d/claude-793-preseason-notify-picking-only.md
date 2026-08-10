- **#793** A non-scoring round (preseason / practice, ADR-0016) now notifies you about
  **picking** and nothing else — the line-shift alert is gated off for it, the pick reminder
  keeps firing and its copy says the round doesn't count. The gate sits on line-shift
  detection, not the merged delivery step (#731), so the reminder survives; the cron's
  `lineShifts` summary now names why it skipped. files: `src/lib/server/notifications.ts` ·
  `src/lib/domain/notifications.ts` · `docs/adr/0016-non-scoring-rounds.md`
