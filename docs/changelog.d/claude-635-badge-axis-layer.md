- **#635** Add a badge axis layer — a paired badge now declares one measure, two ends, an
  honest zero, and a bar, and each end awards independently, so an axis yields 0, 1, or 2
  titles instead of always crowning both ends of a sorted list. Line lean imports the zero and
  ±10-point threshold `lineSideTendency` already ships, so `/stats` and the badge can no longer
  disagree about the same player: on 2025, Doug keeps 🐶 Dog Lover at 19.6 points clear while
  Brett's 54.0% favorite share stays in the dead zone and the chalk end goes unclaimed. Crowd
  lean (🐺/🐑) migrates onto the axis with its zero deliberately unset and stays dark. The
  awards card now groups by axis rather than by member, and an axis nobody earned renders
  nothing. Governed by ADR-0035. files: `src/lib/domain/badges.ts` ·
  `src/lib/components/group/LeagueHonors.svelte` · `src/lib/components/AwardsGuide.svelte` ·
  `src/lib/utils/stats.ts`
