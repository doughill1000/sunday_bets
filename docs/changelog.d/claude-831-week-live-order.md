- **#831** `/week`'s game cards now lead with whatever is actually in progress, above the
  games already final and above kickoffs still to come — at 4:40pm on a Sunday the finished 1pm
  games used to sit above the 4:25s deciding the week. The live window also now reaches the
  grade cron that replaces it (was sized by game length instead), and polling stops once every
  in-window game reports final, so `Final — unofficial` is reachable instead of expiring before
  it can ever show. Salvaged from the held `/picks` PR #829, moved to its correct home per the
  ordering settled on #823.
  files: `src/lib/live/config.ts` · `src/lib/utils/weeklyPicks.ts` ·
  `src/lib/components/leaderboard/WeeklyPicksBreakdown.svelte` ·
  `src/lib/components/leaderboard/WeeklyLiveBoard.svelte`
