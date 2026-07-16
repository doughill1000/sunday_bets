- **PR #686** Rework the grade cron's schedule to settle TNF, MNF, and late-season
  Saturday finals within about an hour of the game ending instead of waiting for Sunday,
  and split the weekly results-recap / AI-recap-ready pushes into a new `weekly-recap`
  cron (Tue ~9am ET) so they land at a normal hour instead of ~4am. files:
  `.github/workflows/cron-grade.yml` · `.github/workflows/cron-weekly-recap.yml` ·
  `src/routes/(app)/api/cron/weekly-recap/` · `src/lib/server/cronHealth.ts`
