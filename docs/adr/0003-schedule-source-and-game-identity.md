# ADR-0003: Schedule source and game-identity / reconciliation model

- Status: Accepted
- Amended: 2026-08-09 (#791), 2026-08-11 (#801), 2026-08-11 (#804) — see the amendment
  sections below
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
A schedule source seeds a game _before_ any odds exist, so the seeded row has no Odds
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

- **Schedule sync** is the writer that _creates_ `games` rows. It upserts by the
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

## Amendment (2026-08-09, issue #791): week windows are anchored in US Eastern

Decision §5 made schedule sync the owner of deriving and persisting week windows but left
the anchor unstated. `weekBoundaries()` implemented it in **UTC** — snap back to the
Tuesday 00:00 UTC before the first kickoff, forward to the Tuesday 00:00 UTC after the last
one plus a four-hour "game is over" grace.

That is wrong for the NFL calendar. A Monday-night kickoff is 8:15pm ET, which is already
**00:15 on Tuesday in UTC**, so the forward snap cleared the Tuesday it was aiming at and
landed on the next one. Every week with a Monday-night game was stored fourteen days long,
overlapping the following week by seven. In prod that was all seventeen 2026 regular weeks
that had been synced (1–17); week 18 and the four preseason weeks, which have no Monday
night game, were correct.

The overlap was not cosmetic. `findRecentGradableWeeks()` grades the active week plus the
most-recently-**ended** one, and an overlapped week is neither — still open, yet outranked
on `start_ts` by the week that has already begun. The grade cron would have worked on week
`m` and week `m-2` for the whole season, so every completed week (and with it standings, the
AI recap and both recap pushes) would have run seven days late, with no self-healing path:
the reconcile sweep needs `final_scores`, and the only writer of those runs solely for the
weeks this query returns.

**The anchor is now US Eastern (`America/New_York`), resolved through the IANA zone rather
than a fixed offset**, and the grace period is gone:

- `start_ts` = Tuesday 00:00 ET on or before the week's first kickoff.
- `end_ts` = the first Tuesday 00:00 ET strictly after its last kickoff.

An NFL week genuinely is Tuesday-to-Monday-night in Eastern, so the boundary now falls in
the dead hours the schedule leaves for it. Windows stay gapless and non-overlapping,
including across the DST change, where one week is simply 7 days ± 1 hour. Adding any
"game is over" cushion past the final kickoff would push the boundary back over midnight ET
and re-create the week-long overshoot, so there is deliberately none: Monday Night Football
kicks off 3h45m before its own boundary.

This also closed a second, pre-existing hole. Under UTC the next week went active at 00:00
UTC — fifteen minutes _before_ Monday Night Football kicked off — so `findActiveWeek()`
named the wrong week for the duration of every MNF, taking the live sweat board (#386),
that game's pick reminder and its odds sync with it. It had never been observed because no
season had yet been played live in the app.

**The durable rule this establishes:** a rule about _when an NFL week is_ belongs in the
league's own timezone, not in UTC. UTC is right for storing an instant and wrong for
deciding which calendar day an 8:15pm Eastern kickoff falls on.

Worth noting how long this hid. Seasons 2022–2025 all carry correct 7-day windows because
they were **imported** by `supabase/scripts/import-historical`, never produced by
`syncSchedule` — 2026 is the first season this code path has ever created. Suspect the same
class of defect in anything else whose first live exercise is the 2026 season.

## Amendment (2026-08-11, issue #801): odds sync also primes the upcoming week

The Context above describes odds sync as "scoped to the active week". That was a
description of the pre-ADR implementation, not a decided boundary — but it stayed true
after this ADR shipped, and it turned out to be a defect. A week could acquire lines only
_after_ it was already the active week, so every newly-active slate rendered as all
"No line" until the next daily sync landed: a hole of roughly half a day, every week,
falling on the evening people opened the app to look at the new slate. Cron scheduling
could not fix it, because GitHub's scheduler drifts by up to two hours and a single
failed run stretched the hole past a day.

**Odds sync now covers the active week _and_ the next week that has not started yet**,
so a slate is lined days before players ever see it and cron timing stops mattering. The
upcoming week is resolved by `start_ts`, never by week number — preseason weeks count
DOWN under ADR-0016, so "the next higher week number" walks backwards into a week already
played. Priming is best-effort: a failure there is reported in the run's per-week results
rather than thrown, because the active week is the slate players are actually looking at
and its completed work must survive.

This sits inside the model Decision §3 already establishes — schedule sync still owns
creating `games` rows, and odds sync still only attaches lines to matchups that already
exist, by unordered team pair. It adds no trust boundary and touches no scoring or
fairness semantics; the only cost is one extra Odds API request per run against a monthly
cap the app uses a low single-digit percentage of. The Alternatives note about the
`/events` endpoint is unaffected: this widens the window by one week, and still cannot
produce a full forward season.

**The durable rule this establishes:** an ingestion job's scope should be set by what
players will need next, not by what they are looking at now. Anything that fetches "the
current thing" should be checked for whether the next thing is ready before it becomes
current.

## Amendment (2026-08-11, issue #804): odds sync stops writing at kickoff

Decision §3 gives odds sync one stated reason to skip a returned game — no matching
matchup exists yet — and otherwise has it attach `external_game_id` and write the line.
It never said _when_ that stops. The Odds API `/odds` endpoint answers a week window with
**live** events as well as upcoming ones, and FanDuel quotes in-play spreads for them, so
a sync running mid-slate wrote the in-play number as the game's active line. Nothing
downstream re-derives an active line, so it stayed that way permanently: 12 such rows
across the 2025 season in prod, up to 3h10m after kickoff, the worst reading -29.5 on a
game that closed at -3 with the favorite flipped.

**Kickoff is now a hard boundary on this write path**: odds sync skips any returned game
whose `commence_time` has passed, and reports the count in its sync stats alongside the
existing skip reasons. This narrows the `external_game_id` clause above — odds sync
attaches provider ids only for games that have not started. That id feeds only the Odds
`/scores` grading fallback; ESPN, the primary under ADR-0025, matches finals by the
matchup identity this ADR establishes, so identity and grading are unaffected.

The guard is deliberately in the sync loop and **not** in `set_active_line`. Historical
imports legitimately write a single post-kickoff row as a past game's active line, and
that fallback is the only reason the 2022–24 seasons resolve a line at all. The rule
being enforced is about this ingestion path, not about the shape of a `game_lines` row.

No settlement path was exposed while the gap was open — Gamer grades on the pick-time
snapshot, House on the flagged closing line (`fetched_at <= commence_time`, ADR-0007),
and the ATS read model prefers the closing line ahead of its active-line fallback. Three
independent filters, each correct for its own reasons, none of them the invariant.

**The durable rule this establishes:** when several downstream readers each happen to
exclude bad data, the data is not safe — it is unowned. Put the guard at the write, where
one rule can be stated and tested, rather than trusting a coincidence of filters to keep
holding as read models are added.
