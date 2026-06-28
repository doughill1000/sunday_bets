# ADR-0016: Non-scoring rounds and ESPN preseason sourcing

- Status: Proposed
- Date: 2026-06-27
- Issue: #274
- Supersedes: None

## Context

The app has no real "doesn't count" round. A graded `pick_settlement` row counts
everywhere standings or stats are shown, because all eight leaderboard/stats aggregations
(`leaderboard_season_totals`, `stats_season_trend`, the four `stats_accuracy_*`,
`stats_head_to_head`, `stats_alltime_totals`) sum every settlement row with **no scoring
filter**. The only thing that ever excludes a round is a single query filter in
`getSeasonWeekOptions` (`.gte('week_number', 0)`), which merely hides preseason from the
leaderboard week dropdown. Grading, `findActiveWeek`, and every matview ignore it.

So the existing "preseason" notion is half-built and leaky: preseason is modelled only as
a **negative `week_number`** that `odds.ts` maps to the preseason odds sport key. Nothing
live produces such a week — the ESPN schedule sync hardcodes `seasontype=2` (regular
season) and only creates weeks 1–18, and the negative-week seed is fully commented out — so
prod has zero preseason rows today. But if a preseason (or any "fun") game were ever
created, picked, and graded, it would silently move the real season standings.

We want a deliberate, single-source-of-truth way to mark a round **non-scoring** ("practice"
/ "fun" / preseason): players still pick and see graded win/loss/push results, but those
settlements contribute zero to every standings and stats surface, and the UI says so. This
changes scoring semantics, so it is gated on this ADR (the `docs/adr/README.md` "changes
gameplay fairness or scoring semantics" trigger). It also widens #274's original scope: we
deliberately add ESPN **preseason** fetching so a non-scoring round can run on real NFL
preseason games, overriding the issue's "no new schedule sources" exclusion.

## Decision

Add a single boolean gate, `weeks.is_scoring` (`boolean not null default true`), as the
sole source of truth for whether a round's settlements count.

Boundaries future work must preserve:

1. **`is_scoring` is the only scoring gate.** Grading and settlement run **unchanged** for a
   non-scoring round — settlements are still written and results are still displayed (the
   weekly breakdown reads `pick_settlement` directly, not the matviews). Exclusion happens
   at aggregation time: **every** matview that aggregates `pick_settlement` filters
   `where w.is_scoring`. This applies to all eight, not only the two leaderboard views, so a
   non-scoring round is invisible to season standings, weekly/cumulative trend, accuracy,
   head-to-head, and all-time totals alike. The all-time views, which did not previously
   join `weeks`, gain a `games`→`weeks` join solely to apply this filter.
2. **`week_number < 0` is the preseason odds signal only, orthogonal to scoring.** It stays
   the single trigger for `odds.ts` `sportKeyForWeek` (preseason sport key) and for hiding
   the round from the leaderboard week dropdown's default. Whether a round counts is decided
   exclusively by `is_scoring`, never by the sign of `week_number`. A future "practice round"
   on regular-season games would set `is_scoring=false` with a non-negative `week_number`.
3. **Preseason is sourced as a non-scoring round.** The ESPN schedule sync fetches
   `seasontype=1` and writes preseason weeks with a negative `week_number` and
   `is_scoring=false`. Odds for those weeks route via the existing negative-week convention.
4. **Legacy reconciliation.** The column-adding migration backfills any pre-existing negative
   `week_number` rows to `is_scoring=false`, so no historical/demo preseason data can count.

Drop-worst-week (ADR-0005) and the grading preset (ADR-0007) are unaffected: the
`where w.is_scoring` filter sits upstream of the drop-worst-week logic in
`leaderboard_season_totals`, so the "worst week" is chosen only among scoring weeks, and no
settlement math or `graded_preset` freeze changes. The materialized-view set and the
`refresh_leaderboard_stats()` contract (ADR-0013) are unchanged — the filter lives inside
each view definition, refreshed by the same path.

## Consequences

- **Helpful:** a round can be marked non-scoring with one boolean, and it provably
  contributes zero to every standings/stats surface. The previously leaky preseason notion
  becomes safe and explicit. Preseason can now run as a real, no-stakes "fun" round.
- **Harmful / cost:** the all-time stats views take on a `games`→`weeks` join they did not
  need before (kept 1:1, so totals are unaffected). Every settlement-writing path still owes
  a matview refresh (ADR-0013), unchanged. There is no admin UI to flip the flag in v1, so
  marking an ad-hoc practice round is a data/migration operation until a follow-up adds one.
- **Migration:** adds the column (default true, so existing regular weeks are untouched) and
  backfills negative weeks to false. The eight matviews are re-emitted with the new filter;
  the seven `stats_*` source files are corrected from `drop view` to
  `drop materialized view` so re-emission against the already-materialized DB does not error.

## Alternatives considered

- **`week_type` enum (`regular | preseason | practice`).** More expressive, and could fold
  preseason in explicitly, but it adds a new type and surface for no behavioural gain — the
  only question the system asks is "does this count?", which one boolean answers. `odds.ts`
  would still need a preseason signal regardless. Rejected for simplicity.
- **Exclude only the two named leaderboard views (issue-literal).** Leaves accuracy,
  head-to-head, and all-time totals counting non-scoring picks, contradicting "doesn't count
  anywhere." Rejected in favour of filtering all eight.
- **Skip writing settlements for non-scoring rounds.** Would make results invisible, but the
  feature requires showing graded win/loss/push. Rejected; we exclude at aggregation, not at
  grading.
- **Keep preseason out of scope (data-only marking).** Would satisfy the standings fix but
  leave no way to populate a fun round with real games. Doug chose to widen scope to fetch
  ESPN preseason; rejected in favour of that.

## Follow-up

- #274 tracks this work. Update the issue body to record the widened preseason scope.
- A future issue could add an admin toggle to mark any week non-scoring, and/or a separate
  "practice leaderboard" for the fun round. Postseason (`seasontype=3`) sourcing is also a
  later option.
