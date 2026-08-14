- **#836** The `/week` scorecards now show the game's line beside the matchup, so looking back
  at a settled week tells you what the pick was _against_ and not just who won. The card reads
  the closing line where one was captured and the current line otherwise; a game the book never
  posted renders exactly as it did before. It is the game's line as context — never the per-pick
  line any member was graded against. files:
  `src/lib/components/leaderboard/WeeklyPickCard.svelte` · `src/lib/utils/weeklyPicks.ts` ·
  `src/lib/domain/spread.ts` · ADR-0007
