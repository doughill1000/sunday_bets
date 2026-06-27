# ADR-0013: Leaderboard and stats served from materialized views refreshed on grading

- Status: Proposed
- Date: 2026-06-26
- Issue: #191
- Supersedes: None

## Context

The leaderboard and stats pages were the two slowest screens in the app. Their data
came from regular (non-materialized) views — `leaderboard_season_totals`,
`stats_season_trend`, and the six `stats_*`/`stats_*_alltime` views — each of which
re-runs heavy `GROUP BY` + window-function aggregations over `pick_settlement` (joined
to `games`, `weeks`, `seasons`, `users`, and `teams`) on **every page load**.

The underlying settlement data only changes during grading, which happens a few times a
week (the grading cron, plus admin `grade-game`/`grade-week`/`grade-season`). Recomputing
the full aggregation per request is therefore pure waste: the same answer is produced
between grades. The data is small (a handful of players, ~13 games/week), so the cost is
latency, not scale — but it is paid on the most-visited read paths.

A prior architecture review filed #191 ("cache leaderboard and stats reads") scoped to
HTTP/response caching, explicitly deferring view materialization as a separate "Tier B".
This decision is that Tier B, and #191 is repurposed to track it.

## Decision

Convert the eight leaderboard/stats aggregation views to **materialized views** and
refresh them at the **end of every grading run**.

Boundaries future work must preserve:

1. **Grading is the only writer that must trigger a refresh.** After `grade_game`,
   `grade_week`, or `grade_season` commits, the server grading helpers
   (`src/lib/server/grading.ts`) call the SQL function
   `public.refresh_leaderboard_stats()`. Any new code path that writes
   `pick_settlement` (backfills, demo seed, prod-data clone, imports) must refresh the
   matviews afterward, or the leaderboard will show stale data until the next grade.
2. **Refresh is `CONCURRENTLY` and never blocks or fails the grade.** Each matview
   carries a unique index on its natural key so `REFRESH MATERIALIZED VIEW CONCURRENTLY`
   can run (it keeps the view readable during refresh and is transaction-safe inside the
   function). A refresh error is logged (Sentry + console) but **not** thrown: the grade
   has already committed and the matview self-heals on the next grade.
3. **Reads stay service-role only.** Materialized views cannot carry RLS. All
   leaderboard/stats reads already go through the service-role client, which bypasses RLS
   and filters by `group_id`; cross-group isolation is enforced by that `group_id` filter
   (and is covered by pgTAP). The schema-wide `grant select on all tables` does **not**
   cover matviews, so each matview grants `select` to `service_role` explicitly and
   revokes the client roles.

`refresh_leaderboard_stats()` is `SECURITY DEFINER` (owned by `postgres`) because
`REFRESH` requires matview ownership and the calling `service_role` is not the owner.

Views deliberately left as **regular** views (trivial or not on the hot path):
`current_season_year`, `ui_games`, the `picks_*` views, and
`leaderboard_weekly_cumulative`.

## Consequences

- **Helpful:** leaderboard/stats reads drop from a full multi-join aggregation to an
  index scan over a small precomputed table. The freshness contract is exact —
  invalidation is tied to grading, the only event that changes the inputs.
- **Harmful / cost:** a new operational invariant — _every_ settlement-writing path must
  refresh the matviews. We wired the grading helpers, the demo seed, the prod-clone
  script, and the integration fixture; backfill/import scripts and any future writer must
  follow suit. Tests that insert settlements directly (pgTAP, some integration tests) must
  call the refresh before asserting on the views, because a matview does not reflect
  freshly-inserted base rows until refreshed.
- **Migration:** the conversion drops each regular view and recreates it as a matview in
  one migration (`create or replace materialized view` does not exist). On a local
  `db reset` the matviews are created `WITH DATA` against empty tables and then prod data
  is cloned in, so the clone path refreshes them; the same applies to the demo seed.

## Alternatives considered

- **HTTP/response caching (the original #191 scope).** Caches the rendered response, not
  the computation, and needs its own invalidation keyed off grading anyway. It can still
  be layered on later if measurement shows it helps; it does not remove the per-request
  aggregation the way materialization does.
- **Non-concurrent `REFRESH`.** Simpler and callable in any transaction, but takes an
  `ACCESS EXCLUSIVE` lock that blocks reads during the refresh. We chose `CONCURRENTLY`
  (plus unique indexes, which also serve the `group_id`/`season_year` read filter) so the
  live read path is never blocked.
- **Refresh inside the `grade_*` SQL functions.** Would cover every direct-rpc caller
  automatically, but a refresh failure would roll back the grade, and it couples grading
  to the refresh. Keeping the refresh in the server layer (post-commit, best-effort) keeps
  a transient refresh error off grading's critical path.
- **Trigger-based incremental maintenance on `pick_settlement`.** Far more machinery
  (and per-row overhead) than this app's grade-batch cadence needs.

## Follow-up

- #191 tracks this work; #190 (scaling observability) could measure the before/after p95
  on the leaderboard/stats SSR paths.
- If a future settlement writer is added outside grading, extend it to call
  `refresh_leaderboard_stats()` (or fold the refresh into a shared settlement-write
  helper).
