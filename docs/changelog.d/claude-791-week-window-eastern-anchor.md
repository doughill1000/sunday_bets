- **#791** Anchor NFL week windows in US Eastern — a Monday-night kickoff is already
  Tuesday in UTC, so schedule sync stored every 2026 week with a Monday-night game as a
  14-day window that overlapped the next one, hiding each just-completed week from the
  grade cron for a week (and with it standings, the AI recap and both recap pushes). Weeks
  are now Tuesday-to-Tuesday in Eastern, which also keeps Monday Night Football inside its
  own active week. Re-running schedule sync rewrites the affected 2026 rows. files:
  `src/lib/server/weekWindow.ts` · `src/lib/server/scheduleSync.ts` · ADR-0003 amendment
