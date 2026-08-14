- **#824** The Week tab now opens on the season actually in play instead of the last one with
  standings. A preseason round counts for nothing (ADR-0016), so it produces no standings and
  its season was invisible to a default derived from them — leaving the live round, its sweat
  board and its graded pick cards reachable only by hand-editing the URL. The tab now anchors on
  the most recently started week, keeps the last-graded default through the off-season, and
  still honours an explicit season in the URL. The other season-scoped tabs are unchanged.
  routes: `/week` · files: `src/lib/server/seasonDefault.ts` ·
  `src/lib/server/db/queries/findStartedSeasonYear.ts` · adr: ADR-0016 (amended)
