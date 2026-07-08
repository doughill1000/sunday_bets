# ADR-0025: ESPN scoreboard as the primary source of final scores

- Status: Proposed
- Date: 2026-07-08
- Issue: #450
- Supersedes: None

## Context

Final scores currently come from **The Odds API** `/scores` endpoint. `fetchNFLScores`
(`src/lib/server/odds.ts`) pulls recent finals, and grading's `refreshScoresForGames`
(`src/lib/server/grading.ts`) matches each event to a `games` row by `external_game_id`
(the Odds API id), then **fuzzy-matches team names** (`_pickHomeAwayScores` /
`_strEqLoose`) to decide which score is home vs away before writing `games.final_scores`.
Two structural problems force a decision:

1. **The Odds API `/scores` only returns games within a short window** (`daysFrom`, max
   3 days back). Any late grade, re-grade, or historical backfill falls outside that
   window and cannot be sourced from the same path. This is exactly why the 2022–24
   finals had to be patched in manually from ESPN (issue #430, and the game-times
   backfill #444).
2. **The score path re-derives identity that the app already models.** ADR-0003 made the
   durable game identity the matchup tuple `(week_id, home_team_id, away_team_id)`, with
   `external_game_id` demoted to a nullable attribute. Yet grading still keys finals on
   `external_game_id` and then string-matches team names to recover home/away — fragile
   work the schedule model already solved.

Meanwhile, ESPN is **already the schedule source** (ADR-0003; ADR-0016 widened it to
preseason). `fetchEspnWeek` (`src/lib/server/schedule.ts`) hits the ESPN scoreboard on
every schedule sync, and that payload already carries, per game: each competitor's
`score`, an explicit `homeAway` designation, and a `status.type.completed` boolean. The
client validates the payload with Zod but simply does not read the score fields today.
So the data needed to grade is already being fetched, keyed by the identity the app
already uses, with home/away stated explicitly — no name fuzzing, no `daysFrom` window.

ADR-0003 deliberately scoped ESPN to the **schedule** and left scores with The Odds API,
keeping schedule and grading on independent providers. This ADR **amends that
score-source boundary** (it does not supersede ADR-0003; the schedule source and the
matchup-identity model are unchanged). Because it changes the source of a grading input,
it is gated on this ADR under the `docs/adr/README.md` "replaces an external service"
and "changes scoring semantics" triggers.

## Decision

**ESPN's scoreboard becomes the primary source of final scores; The Odds API `/scores`
is retained as a fallback, not removed.**

Boundaries future work must preserve:

1. **ESPN is primary, matched by matchup identity.** Final scores are read from the ESPN
   scoreboard payload (`competitors[].score`, gated by `status.type.completed`) and
   attached to the `games` row by the ADR-0003 matchup key — the same
   `(week_id, home_team_id, away_team_id)` reconciliation schedule sync already uses.
   Home/away comes from ESPN's explicit `homeAway` field; teams map through the existing
   `ESPN_ABBR_MAP` → `teams.external_key`. The `external_game_id` + name-fuzzing path
   (`_pickHomeAwayScores` / `_strEqLoose`) is retired for ESPN-sourced finals.

2. **The Odds API `/scores` is the fallback, preserving grading provider independence.**
   ESPN concentrating both schedule and grading onto one undocumented endpoint is the
   central cost of this change; keeping The Odds API path live as a fallback is the
   mitigation, not an afterthought. When ESPN yields no completed final for a game being
   graded (parse failure, unreachable endpoint, or a game ESPN has not marked complete),
   grading falls back to the existing Odds API `/scores` lookup for that game. The
   fallback is per-game, so a single missing ESPN final never blocks the rest of a grade.

3. **Grading semantics are unchanged.** Only the source that populates
   `games.final_scores` changes. The `grade_game` / `grade_week` / `grade_season` RPCs,
   settlement math, drop-worst-week (ADR-0005/0018), the grading preset (ADR-0007), and
   the matview-refresh contract (ADR-0013) are all untouched. Non-scoring/preseason
   rounds (ADR-0016) source finals through the identical ESPN path.

4. **Fail-closed, with payload retention.** Score parsing reuses the schedule client's
   defensive posture (ADR-0003): a malformed or unreachable ESPN response is a non-fatal
   miss (logged to Sentry, no partial write, fall back to Odds API), never a bad final.
   The raw ESPN score payload is retained the way raw Odds API responses already are
   (issue #382, currently Odds-API-only) so a disputed or wrong final is auditable to its
   source bytes.

5. **No `daysFrom` window.** Because ESPN returns any past week's finals arbitrarily far
   back, late grades, re-grades, and historical backfills use the same path as live
   grading. The one-off manual ESPN patches (#430, #444) become the normal path rather
   than exceptions.

## Consequences

**Helpful:**

- Late grades, re-grades, and historical backfills stop being special cases — one path
  covers all of them, removing the class of manual SQL patches that #430/#444 required.
- Finals are matched by the app's real identity model with explicit home/away, deleting
  the fragile `external_game_id` + name-fuzzing logic and its silent-mismatch failure
  mode.
- Zero Odds API quota is spent on scores, freeing the monthly cap entirely for line
  refreshes (the same quota win ADR-0003 already banks for schedule).
- The score source is already proven: ESPN produced the correct 2022–24 finals in the
  #430 backfill.

**Harmful / cost:**

- **Provider concentration.** Schedule and grading now both depend on the same
  undocumented ESPN endpoint; an ESPN outage or schema drift degrades both at once,
  whereas today grading has an independent provider. Mitigated — deliberately — by
  keeping The Odds API `/scores` as a live per-game fallback and by fail-closed parsing,
  but the shared dependency is real and is the main reason this needed an ADR.
- **New maintenance surface.** Score fields become a second reason ESPN schema drift can
  break us; the Zod schema and its tests grow to cover `competitors[].score`.
- **Retention work.** The #382 raw-response capture must be extended to ESPN score
  payloads (currently Odds-API-only) to keep finals auditable.

## Alternatives considered

- **Keep The Odds API primary, unchanged.** Zero work, but leaves the `daysFrom` window
  problem in place — every late grade/backfill stays a manual exception, and the fragile
  name-fuzzing identity match remains. Rejected: it declines the actual wins.
- **ESPN only; drop The Odds API `/scores` entirely.** Simplest data flow and lowest
  quota, but removes grading's independent provider and makes an ESPN outage a full
  grading outage. Rejected in favour of ESPN-primary-with-Odds-fallback, which keeps the
  redundancy for a fairness-critical input.
- **nflverse as the score source.** Documented and stable, but batch-updated, so finals
  land less promptly than ESPN's near-live scoreboard. Kept as ADR-0003's recorded
  schedule fallback; not adopted for scores here.
- **Reuse The Odds API `external_game_id` matching but widen the window.** The window is
  a hard API limit, not a parameter we can widen, and it does not fix the name-fuzzing
  identity path. Rejected.

## Follow-up

- **Flip this ADR's status `Proposed` → `Accepted` in the implementation PR (#450).**
  This ADR travels as Proposed with the implementation; the status change is part of that
  PR's definition of done, not a separate step.
- Implementation issue: **#450** — parse `competitors[].score` + `completed` in the ESPN
  schedule client, an ESPN-first / Odds-API-fallback score-refresh path in `grading.ts`
  keyed by matchup identity, ESPN score-payload retention (extending #382), and tests
  (unit: score parsing + home/away mapping + drift; integration: ESPN-primary and
  fallback-to-Odds; a backfill path with no `daysFrom` window).
- Serialize any migration-ledger, generated `supabase.ts`, and grant/RLS changes against
  other in-flight DB work per WORKFLOW.md (score retention may add a table).
- Revisit if ESPN's endpoint proves unreliable enough that the fallback fires routinely
  (promote nflverse via a superseding ADR), or if a provider disagreement on finals
  surfaces a case the matchup key does not cover.
