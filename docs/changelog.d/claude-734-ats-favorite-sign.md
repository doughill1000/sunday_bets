- **#734** Fix the inverted favorite/underdog label across every ATS read model — the line
  convention is `spread_team_id` = the favorite with a non-negative `spread_value` (what
  `set_active_line` has always written), but two views read fav/dog off the _sign_ instead,
  so /market, the /league Trends cuts, "Where the market bends", the pick-card nugget, the
  /stats line-side tendency and the Chalk Eater / Dog Lover badges all showed the opposite
  side's numbers. Grading and the ledger were never affected (`abs()`-based). A `check`
  constraint now makes the convention enforceable rather than conventional, which is what
  had let the pgTAP fixtures encode a form production never stores and keep the suite green
  while the app was wrong. Also corrects `league_ats_base`'s cascade-dependent list (eleven,
  not nine — two views wrongly documented themselves as exempt) and carries a #735 follow-on
  so the demo seeder flags a closing line. views: `league_ats_base` ·
  `stats_accuracy_by_line_side` · schema: `game_lines` · ADR-0007 / ADR-0013.
