- **#822** The picks board no longer leaves a finished game lit as `LIVE`. Once every game
  had aged out of its live window the board stopped polling but kept rendering the last score
  it ever fetched — so a phone reopened the next morning still showed a frozen mid-game number
  with a running clock, and the staleness warning was switched off in exactly that state. The
  window gate the weekly board already applied now lives in one place and covers both.
  files: `src/lib/live/config.ts` · `src/lib/components/picks/PicksBoard.svelte` ·
  `src/lib/components/leaderboard/WeeklyPicksBreakdown.svelte`
