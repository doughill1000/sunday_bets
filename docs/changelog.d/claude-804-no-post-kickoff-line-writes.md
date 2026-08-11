- **#804** A game's betting line now stops moving at kickoff. The odds feed answers with
  live games as well as upcoming ones, so a sync running during the Sunday slate could
  replace a started game's line with the in-play number — and it stayed that way forever,
  showing a wildly wrong spread on a game you hadn't picked. The sync now leaves a started
  game alone and reports how many it skipped. Nothing was ever mis-graded and no past
  result changes; the 2025 rows this left behind are cosmetic and untouched. Governed by
  ADR-0003 (amended). files: `src/lib/server/oddsSync.ts`
