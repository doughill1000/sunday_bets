- **PR #709** `CI - Integration (with-auth)` filtered on paths at the workflow-trigger
  level, so it never ran at all (no status posted) for PRs outside `supabase/**` ·
  `src/**` · `tests/integration/**` — making its `integration` job unusable as a
  required status check (a PR that doesn't touch those paths would sit "Expected"
  forever). Now triggers on every PR and gates the job internally via
  `dorny/paths-filter`, adding an `integration-result` wrapper job that always
  reports — mirroring `unit-result` / `build-result` / `pgTap-result` /
  `dry-run-result`. Also backfills four changelog gaps the governance-freshness gate
  had flagged (#693, PR #706, PR #700, PR #691). files:
  `.github/workflows/ci-integration.yml`
