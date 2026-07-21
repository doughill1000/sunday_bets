# Participation boundary — read-surface audit (ADR-0037)

- Date: 2026-07-21
- Issue: [#724](https://github.com/doughill1000/sunday_bets/issues/724) (Issue B of ADR-0037)
- Governing decision: [ADR-0037](../adr/0037-participation-boundary.md) (#711)
- Write-side counterpart: #712 / #722 (Issue A, shipped)

## What was audited and why

ADR-0037 gates the **write** side at the single grading choke point: `_grade_games_by_ids`
never creates a `missed` row for a game that starts before
`greatest(groups.competition_starts_at, group_memberships.joined_at)` — the shared
`public._participation_start(group, member)`.

Every surface that reads `pick_settlement` therefore inherits correctness for free. This audit
is the sweep for the exceptions: reads that pair **membership with games themselves**, which can
re-manufacture in the UI (or in a completeness check) exactly the obligation grading stopped
writing.

Scope of the sweep: every `.sql` under `supabase/src/**`, plus every `src/lib/server/**` and
`src/routes/**` module that queries Supabase and pairs members with games. Each surface below is
marked **INHERITS** (reads `pick_settlement` / real `picks`, so it cannot fabricate a row),
**PATCHED** (enumerates independently, now carries the boundary), or **N/A** (no membership or no
games dimension).

## Patched

| Surface                                                          | Defect                                                                                                                                                                                                                                                                                                                                                                                                                              | Fix                                                                                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `find_unsettled_weeks()` — reconcile sweep (#433)                | Defines unsettled as "final game with **zero** `pick_settlement` rows". That assumed grading always owes ≥1 row per game — true only before the boundary. A game played before any league was competing legitimately owes nothing, so the sweep flagged its week on **every tick, forever**, and `_grade_games_by_ids` could never heal it.                                                                                         | New `public._settlement_owed(game)` guard, which calls the same `_participation_start`.                                             |
| `advance_week_if_complete()` (#658)                              | Same predicate, same break — and worse downstream: the week could never report complete, so the grade cron's #744 settled-prior-week gate would never release it.                                                                                                                                                                                                                                                                   | Same guard.                                                                                                                         |
| `isWeekFullySettled()` in `findRecentGradableWeeks.ts`           | Hand-rolled TS mirror of the same predicate — so it broke the same way, in the module that actually drives the grade cron.                                                                                                                                                                                                                                                                                                          | Stops mirroring: defers to the `find_unsettled_weeks()` RPC, so cron gate and sweep cannot drift again.                             |
| `picks_status_board()` — the who's-picked board (ADR-0019, #388) | Cross-joined the active roster to one group-wide `slate` of the week's still-open games. A league whose `competition_starts_at` is next week read as `0/13` behind on a slate it does not owe. (The `joined_at` term cannot bind here — the slate is already restricted to games that have not kicked off, and nobody joins after a future kickoff — so the binding term is the league's competition start, reachable via Issue C.) | Slate computed **per member** against `_participation_start`.                                                                       |
| `assembleWeeklyBreakdown()` — League ▸ Weekly pick grid          | Synthesises `outcome = 'missed'` from "game is final and no pick found", entirely independent of `pick_settlement`. A member grading correctly never penalised still rendered a red **missed** for every game predating their join. The client-side twin of the exact bug ADR-0037 fixed server-side.                                                                                                                               | The fallback carries the boundary via `$lib/domain/participation`; a pre-participation cell reads neutral. A graded row still wins. |
| `getPlayers()` — the roster feeding the grid                     | Supplied no boundary, and did not filter `status = 'active'`, so a `pending` invite appeared as a roster row that then read as missed for the whole season.                                                                                                                                                                                                                                                                         | Resolves `participation_start` per member; filters to `active`, matching grading's population (ADR-0024).                           |

`public._participation_start` remains the one definition. `$lib/domain/participation` is its
single sanctioned TS mirror (same posture as `liveCover`'s mirror of `grade_pick`), used only by
read surfaces that already fetch `joined_at` / `competition_starts_at` as ordinary columns.

Regression coverage: `supabase/tests/059_participation_read_surfaces.sql` (includes two anchor
assertions proving the fixture still reproduces the pre-fix defect),
`src/lib/domain/__tests__/participation.test.ts`, and new cases in
`src/lib/utils/__tests__/weeklyPicks.test.ts` and
`src/lib/server/db/queries/__tests__/findRecentGradableWeeks.spec.ts`.

## Inherits from `pick_settlement` (no change needed)

Verified to read settled rows (or real `picks`, which cannot be fabricated) and therefore to
carry the boundary transitively:

- **Grading entry points** — `grade_game`, `grade_week`, `grade_season` (thin wrappers around the
  gated choke point).
- **Standings / leaderboards** — `leaderboard_season_totals`, `leaderboard_weekly_cumulative`,
  `leaderboard_season_page`, `league_completed_standings`, `stats_alltime_totals`,
  `stats_season_trend`.
- **Stats views** — `stats_accuracy_by_team{,_alltime}`, `stats_accuracy_by_weight{,_alltime}`,
  `stats_accuracy_by_line_side`, `stats_head_to_head{,_alltime}`, `stats_team_book{,_alltime}`,
  `stats_pick_streaks`, `stats_situational_*`, `group_pick_consensus`, `group_pick_cover`.
- **Credibility rating (ADR-0032)** — `player_rating_inputs` selects only from `pick_settlement`;
  `_rebuild_player_ratings`, `rating/rebuild.ts`, `computeRatings.ts` ride it.
- **Recap / Wrapped / badges** — `recap/facts.ts`, `recap/seasonFacts.ts`, `seasonWrapped.ts`,
  `readModels/weeklyAwards.ts`, `domain/badges.ts`. All inputs are settlement-derived; the
  week-completeness gate is game-level.
- **Pick reveal** — `picks_group_view`, `picks_status_view_{user,admin}`, `all_in_declarations`
  read real `picks` rows only.
- **Completeness guard** — `tests/055_pick_settlement_completeness.sql` already carries
  `_participation_start` (added by Issue A).

## N/A (no membership dimension, or no games dimension)

`is_commissioner`, `group_members_page`, `create_group`, `redeem_invite`, `leave_group`,
`remove_member`, `promote_member`, `preview_invite`, `update_recap_opt_out` (membership × users /
invites, never games); `ui_games`, `league_ats_*`, `league_situational_baseline*` (league-wide,
group-independent); `domain/rating.ts` `ratingLadder()` and `recap/facts.ts` `loadGroupMeta()`
(membership × ratings / flags, no games).

The pick-write path (`lock_pick`, `lock_pick_all_groups`, `unlock_pick*`) is deliberately
ungated, per ADR-0037 ruling 2: a game whose kickoff predates a join has by construction already
started, so it is not pickable anyway.

## Known gap, deliberately not closed here

`sendPickReminders()` in `src/lib/server/notifications.ts` targets **every** notifiable user
against the globally-active week's games, with no group scoping and no participation check at
all. `sendAIRecapPushes()` is the milder version (it scopes to active memberships, but not to the
boundary).

Not fixed in this issue for two reasons:

1. It is out of the issue's stated scope (correctness of membership × games **reads**; the
   notification fan-out is a product surface with its own targeting model), and
2. it cannot mis-fire today: a reminder only ever concerns games that have **not** kicked off, so
   the `joined_at` term can never bind, and the only term that could — a future
   `competition_starts_at` — is unreachable until the start-week picker ships.

**Follow-up owner: Issue C.** When the creation/onboarding UI lets a commissioner start a future
week, `sendPickReminders` must gain group scoping + `_participation_start` in the same change, or
a brand-new league will be nagged about a slate it does not owe.
