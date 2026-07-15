- **#669** Bring `/demo` to parity with the shipped app — same four tabs (Picks · League ·
  Stats · Market), the credibility rating, and weekly hardware, instead of the superseded
  Picks/League/Wrapped/Recap mirror. Extracted a shared `StandingsTable` and a `readonly` mode
  on the real `PicksBoard` so the demo and the authed app render identical components instead of
  hand-mirrors; extended the snapshot with `weeklyAwards`/`stats`/`market`; hardened the CI
  drift-guard to catch badge-catalog staleness. Amends ADR-0026 with the IA-mirror rule. files:
  `src/lib/components/leaderboard/StandingsTable.svelte` · `src/routes/demo/`
