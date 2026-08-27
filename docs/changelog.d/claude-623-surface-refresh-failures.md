- **#623** Surface silent read-model refresh failures from the grade cron — the post-grade
  leaderboard/stats and credibility-ratings rebuilds stay best-effort (they still never fail
  a grade), but now report their outcome into `cron_run_log.summary`, so `/admin` flags a
  green run whose read models are actually stale instead of leaving Sentry as the only
  witness. files: `src/lib/server/grading.ts` · `src/lib/server/cronSummary.ts` ·
  `/api/cron/grade` · `/admin` · `docs/observability/health-watchdog.md` (Sentry alert
  setup) · ADR-0013 · ADR-0032
