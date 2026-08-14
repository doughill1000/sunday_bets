- **#823** A finished game on `/picks` now shows its score and how your pick resolved. The
  board could only ever read the live ESPN feed, which ages out with its window, so a game the
  grade cron had settled hours earlier still read `⏱ Kicked off` — permanently, exactly when
  you wanted to see how you did. It now falls back to the graded final and settled outcome the
  database already held, in an explicit, tested order: graded beats an unofficial final beats
  live, and a live score can never supersede a settled one. The live window was also widened to
  reach the grade that replaces it, so the "Final — unofficial" state has real time to appear;
  polling stops once every game in the window is over.
  files: `src/lib/domain/pickResult.ts` · `src/lib/ui/outcome.ts` ·
  `src/lib/components/picks/LockedPicksSection.svelte` ·
  `src/lib/components/picks/PicksBoard.svelte` ·
  `src/lib/components/picks/PicksSummaryBar.svelte` · `src/lib/live/config.ts` ·
  `src/routes/(app)/picks/+page.server.ts`
