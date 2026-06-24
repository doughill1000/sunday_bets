# ADR-0003: Schedule source and game-identity / reconciliation model

- Status: Proposed
- Date: 2026-06-24
- Issue: #123
- Supersedes: None

## Context

The app has no source for a full forward NFL schedule. `src/lib/server/odds.ts`
only calls The Odds API `/odds` endpoint, scoped to the active week and gated by a
monthly quota, so it cannot return games more than ~1–2 weeks out. Week windows are
hand-seeded (`supabase/seed/002_season_and_weeks.sql`, currently commented out) and a
`games` row only appears once a FanDuel line exists. Two consequences force a decision
before the 2026 season:

1. **No forward schedule.** Operators cannot see or prepare the season ahead of time,
   and players cannot see kickoff times — which drive pick lock — until odds land.
2. **Flex/reschedule has no refresh path.** When the league moves a game (flex
   scheduling, weather, international windows), nothing updates `commence_time`. A
   stale kickoff silently mis-times pick lock, the app's core fairness guarantee.

The persistent game-identity model is the hard part. Today
`public.games.external_game_id` holds the **Odds API** game id and carries the only
matchup `UNIQUE` constraint (`uq_games_external`); `upsert_game_by_external_id()` keys
all inserts/updates on it (`supabase/src/functions/games/upsert_game_by_external_id.sql`).
A schedule source seeds a game *before* any odds exist, so the seeded row has no Odds
API id. Odds sync can therefore no longer key on `external_game_id` without creating a
duplicate `games` row for a matchup that already exists — which would orphan picks
(`public.picks` references `games.id`). Reconciliation needs a source-independent
identity.

ADR-0002 already establishes that `games`, `seasons`, and `weeks` are **global,
shared NFL data — never multiplied per group** — and that the cron ingestion pipeline
is global. This ADR operates entirely within that boundary; it adds a second global
ingestion source and does not touch tenancy.

A schedule source must therefore: cover the full forward season with UTC kickoff
times, update promptly on flex, require **no API key**, and cost **zero Odds API
quota**.

## Decision

### 1. Schedule source: ESPN's unofficial public API

Use ESPN's public (undocumented) endpoints —
`site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` and the season
`schedule` endpoints — as the canonical schedule source. They return the full forward
season, per-game UTC kickoff times, and update promptly when the league flexes a game.
They require no key and are independent of The Odds API, so schedule refresh costs zero
Odds quota.

The cost is that the endpoint is undocumented and may change shape without notice. The
schedule client must therefore parse defensively, treat a malformed or unreachable
response as a non-fatal sync failure (logged to `cron_run_log`, surfaced to Sentry,
never a partial write), and never delete or repoint existing rows on a parse failure.
nflverse is recorded as the documented fallback source should ESPN become unreliable;
adopting it would be a follow-up ADR amendment, not a silent swap.

### 2. Game identity: stable matchup key, source ids as attributes

The durable identity of a game is its **matchup within a week**, not any single
provider's id. Adopt `(week_id, home_team_id, away_team_id)` as the reconciliation key
and back it with a `UNIQUE` constraint. Two NFL teams meet at most once in a given
week, so this tuple is unique and provider-independent.

Provider ids become non-identifying attributes of the matchup row:

- `external_game_id` (existing) stays the **Odds API** id, becomes **nullable**, and is
  populated when odds sync first attaches a line. Its `UNIQUE` constraint is retained
  (a partial/standard unique that tolerates NULLs) so two matchups never share an Odds
  id, but it is no longer the primary reconciliation key.
- A new nullable column (e.g. `schedule_game_id`) stores the ESPN event id for
  observability and re-sync, and is **not** an identity key.

`games.id` (uuid) remains the single stable handle that `picks`, `game_lines`,
`pick_settlement`, and `results` reference. It is created once by schedule sync and
never changes for the life of a matchup — across flex moves and across odds attachment.

### 3. Reconciliation: schedule seeds, odds attaches by matchup

- **Schedule sync** is the writer that *creates* `games` rows. It upserts by the
  matchup key: insert when the matchup is new, otherwise update `commence_time`,
  `status`, and `schedule_game_id` in place on the existing `games.id`.
- **Odds sync** stops creating identity. `upsert_game_by_external_id()` is replaced (or
  superseded by a new RPC, e.g. `attach_line_to_matchup`) that **finds** the game by
  matchup, sets `external_game_id` if currently NULL, and writes the line. It must
  match on the **unordered** team pair within the week so a home/away disagreement
  between providers does not create a duplicate, and it must **never flip** an existing
  row's home/away designation (the schedule source is canonical for home/away). If no
  matching matchup exists yet, odds sync skips that game and reports it in its sync
  stats rather than inserting a row — schedule sync owns creation.

### 4. Flex / reschedule semantics

A changed source kickoff updates `games.commence_time` **in place** on the existing
`games.id`. Picks, locked snapshots, and lines are untouched; nothing is deleted or
re-created. Because pick lock is computed from `commence_time`, the corrected kickoff
immediately and correctly re-times lock. Schedule sync never deletes a game that has
picks attached; a game that disappears from the source is flagged (e.g. status
`postponed`/`cancelled`) for operator review, not hard-deleted.

### 5. Season/week seeding ownership moves to schedule sync

Schedule sync becomes the single writer of `seasons`, `weeks`, and `games` for the
upcoming season, replacing hand-seeded SQL. The commented-out
`supabase/seed/002_season_and_weeks.sql` is retired rather than revived. Week pick
windows remain a product concept derived around the source's week boundaries; schedule
sync owns deriving and persisting them. Per ADR-0002, per-week rule overrides live in
`group_week_overrides` and are never added as columns on the global `weeks` row.

### 6. Operational shape

Schedule sync runs on a `requireCronSecret()`-guarded `POST /api/cron/sync-schedule`
endpoint, wrapped in `withCronLog('sync-schedule', …)` so every run lands in
`cron_run_log`, scheduled by a GitHub Actions workflow mirroring the existing
`cron-sync-odds.yml`, plus an admin manual trigger. It is the same operational pattern
as the other crons; only the data source is new.

## Consequences

**Helpful:**

- Operators get the full season ahead of kickoff; players see correct kickoff times
  from the moment the schedule is published, independent of odds availability.
- Flex moves are corrected automatically, protecting the kickoff-lock fairness
  guarantee — the highest-value outcome of this work.
- Game identity becomes provider-independent. Swapping or adding a line/schedule
  provider later no longer threatens to duplicate games or orphan picks.
- Zero Odds API quota cost; the monthly cap is freed for line refreshes.

**Harmful / costs:**

- Dependence on an undocumented ESPN endpoint that can break without notice. Mitigated
  by defensive parsing, fail-closed (no partial writes) sync, Sentry alerting, and a
  recorded nflverse fallback — but it is real operational risk and a likely future
  maintenance touch.
- Migrating the identity model is a non-trivial DB change: a new matchup `UNIQUE`
  constraint, `external_game_id` made nullable, a new `schedule_game_id` column, and a
  reworked attach-by-matchup RPC — all through the hash-ledger flow, with regenerated
  types, grants, and pgTAP. Existing rows must be backfilled so the new matchup key is
  unique before the constraint is added.
- Two providers must agree on team identity and week boundaries. Team-name → team-id
  mapping now has a second vocabulary (ESPN abbreviations alongside Odds API full
  names); a mismatch silently drops a game from a sync. Requires a tested mapping and
  skip-with-report behavior.
- A subtle home/away disagreement between providers, if mishandled, could still
  duplicate a matchup. The unordered-pair match and "never flip home/away" rules are
  load-bearing and must be covered by tests.

## Alternatives considered

- **The Odds API `/events` endpoint as the schedule source.** Same vendor, but it only
  returns games within the active odds window (~1–2 weeks) and would consume quota — it
  cannot produce a full forward season. Rejected: fails the forward-schedule and
  zero-quota requirements.
- **nflverse data repo as the primary source.** Documented and stable, but batch-updated,
  so intra-week flex moves land less promptly than ESPN — weakening the core fairness
  outcome. Kept as the recorded fallback rather than the primary. Rejected as primary.
- **Keep `external_game_id` (Odds API id) as the identity and let schedule sync write
  it.** The schedule source does not know the Odds API id, so this is impossible without
  a separate matchup-based join anyway. Rejected: reintroduces the duplication problem
  it is meant to solve.
- **Synthetic deterministic id (hash of season/week/teams) as the primary key.** Encodes
  the matchup into a single column, but bakes the identity rule into an opaque value and
  complicates debugging and home/away tolerance. A plain `UNIQUE` on the explicit tuple
  is clearer and lets Postgres enforce it. Rejected.

## Follow-up

- Implementation issue: **#123** — schedule client, `scheduleSync.ts`, cron endpoint +
  GitHub Actions workflow + admin trigger, the matchup-identity migration and
  attach-by-matchup RPC, reconciliation changes to `oddsSync.ts`, and tests (unit
  normalization + team mapping; pgTAP for the matchup upsert and in-place flex update;
  integration for full import → flex → no-duplicate odds sync).
- Serialize the migration-ledger, generated `src/lib/types/supabase.ts`, and any
  grant/RLS changes against other in-flight DB work per WORKFLOW.md.
- Revisit this decision if ESPN's endpoint proves unreliable in production (promote the
  nflverse fallback via a superseding ADR) or if a provider's home/away or week-boundary
  modeling diverges enough to need a richer matchup key.
