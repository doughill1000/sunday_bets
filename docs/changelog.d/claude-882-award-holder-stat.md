- **#882** Season award popovers now show the number that earned each holder the award —
  including rate and record for verdict titles, player-vs-room positions for axis titles,
  and individual counts for multi-holder milestones. The badge engine carries the selected
  measure with the holder so the UI cannot drift by recomputing it; awards without one honest
  number omit the line cleanly. `badges.ts` · `honors.ts` · `LeagueHonors.svelte`
