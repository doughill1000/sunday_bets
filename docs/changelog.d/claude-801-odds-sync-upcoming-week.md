- **#801** Odds sync now lines the **upcoming** week as well as the active one — a week
  could previously acquire lines only after it had already gone live, so every new slate
  rendered as an all-"No line" screen until the next daily sync landed, for roughly half a
  day each week. Priming the next week days ahead takes cron timing out of it, and a
  failure there never costs the live slate its own sync. A second Tuesday run sits just
  behind the week rollover as a backstop. Governed by ADR-0003 (amended). files:
  `src/lib/server/oddsSync.ts` · `src/lib/server/db/queries/` ·
  `.github/workflows/cron-sync-odds.yml`
