# ADR-0032: Cross-season credibility rating ("who knows ball")

- Status: Proposed
- Date: 2026-07-13
- Issue: #361
- Supersedes: None

## Context

The app surfaces two numbers about a player and neither answers "who actually knows
ball over the long run":

1. **Raw records** (`128-96-6`) — kept raw everywhere by ADR-0005/ADR-0018. They
   measure volume as much as quality; a grinder who picks every game outranks a
   selective sharp on total wins.
2. **Season standings points** — drop-worst-week adjusted and **season-scoped**
   (ADR-0018). They reset every year, so a player who has quietly beaten the market
   for three seasons has no durable number, and a hot six-week newcomer outranks them
   on the only visible score.

Issue #361 is the **scoring half** of #229 item 3, a persisted cross-season "who knows
ball" rating; the cosmetic half (playstyle archetypes) already shipped via #277. The
need is a third, durable number that rewards _called shots over time_ rather than
volume or a single season's run.

Any such number is socially loaded — it ranks real people against each other — which is
why #361 is ADR-gated and its acceptance criteria demand the math be **deterministic,
pure, unit-tested, and explicitly not AI-decided** ("an LLM must never decide it").
ADR-0008 already bounds AI to a voice-only role; a credibility score sits squarely
inside the fairness-and-scoring trigger for an ADR, and must be reconciled against the
two existing numbers rather than quietly replacing either.

## Decision

Introduce a **cross-season, per-`(group, user)` credibility rating** on a 1500-centered,
ELO-comparable scale, computed as a deterministic pure function of settled picks.
Boundaries future work must preserve:

1. **It measures beating the Market, not beating peers.** Each settled **spread** pick
   is scored against its **closing line** (cover / no-cover / push); the rating is how
   well a player beats that line over time, conviction-weighted, mapped onto a familiar
   1500 scale (higher = sharper). Honest note on the math: because the closing spread is
   an efficient ~50/50 market, a _literal_ pairwise ELO (player vs. "the market" as a
   fixed-rating opponent) degenerates toward a **conviction-weighted, sample-shrunk
   cover performance**. We adopt that honest form and present it on the ELO-comparable
   scale for legibility, rather than dressing it as a head-to-head ELO the data cannot
   support. The exact update function (K-factor / logistic mapping / shrink prior) is an
   implementation detail bounded by the invariants here and tuned in #361, not frozen in
   this ADR.

2. **Conviction-weighted.** A decision's contribution scales with its `weight_enum` in
   the `L < M < H < A` (All-In, ADR-0023) order the `weight_points` ladder already
   encodes: an All-In cover moves the rating more than a Low cover, and an All-In miss
   costs more. This is what makes the number a measure of _called shots_, not attendance.

3. **Inputs — spread picks only, v1.** Only settled `pick_settlement` rows with
   `outcome in (win, loss, push)` feed the rating. **`missed` is excluded** — the auto
   no-pick penalty (ADR-0024) is an absence, not a bad read, and the standings already
   punish it; folding it into a _credibility_ measure would double-count diligence as
   skill. **Totals-market picks are excluded for v1** (ADR-0022 is unbuilt); extending
   the rating to totals when that ships is a deliberate follow-up, not a silent change.

4. **Soft season reset.** At each season boundary the rating regresses partway toward
   1500 (carry the majority of the prior deviation, shed roughly a third) before the new
   season's picks apply. Reputation is sticky — a multi-year sharp opens a season
   credibly above 1500 — but not immovable, so a cold season can still move the number,
   which is what keeps a "this season" delta arrow meaningful. The exact fraction is
   bounded to "partial, toward 1500" and tuned in #361.

5. **Hidden until qualified.** Below a fixed minimum sample (~20 settled career
   decisions) a player has **no rating**; every surface renders an explicit
   "Unrated — N to go" state, never a provisional number. A rating on a handful of picks
   is noise that would misrank people and undermine the trust the number exists to
   create. The threshold is a single constant, tuned in #361.

6. **Scope — per `(group, user)`.** A rating is computed within a group's membership,
   consistent with the tenancy boundary (ADR-0002) and the per-`(group, user)` read
   model (ADR-0013). The vs-Market math would _permit_ one global rating, but per-group
   keeps it inside the boundary every other stat respects and lets each league surface
   its own sharps. A cross-group "global" rating is explicitly out of scope.

7. **Deterministic, pure, not AI-decided.** The rating is a pure function of
   `(ordered settled spread settlements, weights, season boundaries, constants)` — same
   inputs always yield the same output, with no randomness, no model inference, and no
   LLM anywhere in the computation. This satisfies the fairness criterion and stays
   inside ADR-0008's voice-only boundary: AI may later _narrate_ a rating (#283) but may
   never compute or adjust one.

8. **Compute architecture — pure TS fold + rebuilt persisted read-model.** The rating is
   a **sequential chronological fold** over each player's settled decisions, unlike every
   existing stat, which is a set aggregation — so it does _not_ fit the "add another
   materialized view" shape the issue's "Likely files" note imagined. Instead:
   - the fold lives in a **pure, exhaustively unit-tested TypeScript module** in
     `src/lib/server/` (satisfies the "pure function, unit-tested" AC directly and keeps
     the fairness-critical math in the most testable place);
   - its full output is persisted into a new **`player_ratings`** read-model table
     (per-`(group, user)`), **rebuilt from scratch** in the same post-grade step that
     calls `public.refresh_leaderboard_stats()` in `src/lib/server/grading.ts`.

   This deliberately mirrors ADR-0013's recompute-from-scratch / self-healing /
   service-role-only contract (no RLS on the read model; reads filter by `group_id`; a
   rebuild failure is logged, not thrown, and self-heals on the next grade) while keeping
   the computation in TS rather than a SQL recursive-CTE matview. `player_ratings` is a
   persisted read model, never a source of truth — it can always be regenerated from
   `pick_settlement`.

9. **A third number, not a replacement.** Records stay raw (ADR-0005/0018). Season
   standings points stay drop-worst-week and remain the **Leaderboard's** canonical
   "total" (ADR-0018). The credibility rating is a separate cross-season analytic that
   lives on **Stats** (the Career hero) and must never be shown as, or conflated with,
   standings.

**Surfacing (bounded here; detailed in the design study and #361).** The rating band
leads the Career `StatsHero` on `/stats` — number + qualitative tier word + season-delta
arrow — demoting Record / ATS% / Decisions to supporting receipts beneath it. The
"Unrated — N to go" state is first-class wherever the rating would appear. Qualitative
tier bands (illustratively Square / Solid / Sharp / Shark) are a deterministic banding of
the score; exact labels and cutoffs are tuned in #361. A cross-player "Credibility
ladder" on `/league` is a **Wave-2 follow-up**, out of this ADR and issue.

## Consequences

- **Helpful:** a durable, tenure-rewarding number that neither the raw record (volume)
  nor the season-reset standings (no memory) can express — it gives long-tenured sharps
  something to defend and makes conviction (All-In) legible over years. Being
  deterministic and pure, it is reproducible, unit-testable, auditable, and defensible
  when it ranks people.
- **Helpful:** reusing ADR-0013's recompute contract means the rating self-heals and can
  never drift from `pick_settlement`; a bad constant is corrected by editing the pure
  module and re-grading (or a one-shot rebuild), with no historical data migration.
- **Cost / new invariant:** a new persisted read model means the `player_ratings` rebuild
  must run on **every** settlement-writing path — the same operational burden ADR-0013
  already imposes. It rides the existing `grading.ts` post-commit hook, but the demo
  seed, prod-clone, imports/backfills, and integration fixtures must trigger it too, and
  pgTAP that inserts settlements directly must rebuild before asserting on the table.
- **Cost:** the rating is a judgment rendered as a number about real people. The
  vs-Market framing (an honest cover-performance on the ELO scale) and the
  hidden-until-qualified gate are the guardrails; constants can be retuned if they feel
  unfair in practice, but the _semantics_ ("beat the closing line, weighted by
  conviction") should stay fixed, or this becomes a different feature.
- **Cost:** three player-facing numbers (raw record, season points, credibility rating)
  is real cognitive load. The Stats-owns-analytics / Leaderboard-owns-standings split
  (ADR-0018) is what keeps them from reading as competing totals — the rating appears on
  Stats only, points on the Leaderboard only — and the UX copy must reinforce it.
- `player_ratings` and its constants are service-role / SQL-only until the Stats
  surfacing ships; the ladder is not built until its follow-up issue.

## Alternatives considered

- **Literal head-to-head ELO** (player-vs-player, or player-vs-market as a rated
  opponent). The pick pool is not a head-to-head tournament and the market is ~50/50, so
  a true ELO needs a synthetic opponent graph or collapses to the cover-performance form
  anyway. We adopt the honest collapsed form rather than present something the data can't
  support. Rejected as misleading.
- **A SQL matview via recursive CTE / window fold.** Keeps everything inside
  `refresh_leaderboard_stats()`, but a sequential fold in SQL is awkward (recursive CTE),
  testable only via pgTAP, and mixes fold logic into the matview `CASCADE` graph. The
  AC's "pure function, unit-tested" language and the fairness stakes favor TS. Rejected.
- **Raw cover% with no rating or scale.** Simplest, but buries quality in volume exactly
  like the record does, ignores conviction, and has no season memory — an accuracy stat,
  not a credibility one, and that stat already exists (`stats_accuracy_*`). Rejected as
  not solving #361.
- **Hard season reset (start at 1500 each year) or no reset (pure lifetime).** Hard reset
  discards the multi-year reputation that is the whole point; no reset makes recent form
  invisible and the season arrow meaningless. Soft reset keeps both signals. Rejected
  both extremes.
- **Show a provisional rating before the minimum sample** (with a confidence band or
  asterisk). Even asterisked, a number on tiny samples misranks people and invites the
  "that's not fair" reaction the feature must avoid. An explicit Unrated state is more
  honest. Rejected.
- **Include missed picks / the standings penalty in the rating.** Conflates diligence
  (showing up) with credibility (reading the board); ADR-0024 already punishes missing in
  the standings. Keeping them separate keeps the rating a clean measure of called shots.
  Rejected for v1.
- **A single global, cross-group rating.** Cleaner "one true number per person," but
  breaks the tenancy boundary every other stat honors and assumes a cross-group
  comparability the app does not otherwise make. Rejected; per-group, revisitable if a
  real cross-group surface is ever built.

## Follow-up

- **#361** (blocked on this ADR being Accepted): the pure rating module + unit tests, the
  `player_ratings` read model + registration in `refresh_leaderboard_stats()` + pgTAP,
  the Career `StatsHero` surfacing + Unrated state, and `src/lib/types/supabase.ts`
  regeneration.
- Final constants (K / shrink prior, season-regression fraction, minimum sample, tier
  cutoffs and labels) are tuned inside #361 within the bounds above; promoting any to a
  per-group commissioner setting later is a separate change.
- **Cross-player "Credibility ladder" on `/league`** — a Wave-2 follow-up issue (blocked
  on #361) giving long-tenured players a public thing to defend.
- Totals-market inclusion when ADR-0022 ships; AI narration of the rating stays with #283
  and remains voice-only (ADR-0008) — it may describe the number, never decide it.
- Design study (surfacing):
  https://claude.ai/code/artifact/2afa10d3-9578-403c-9646-386517a8d514

## Amendment history

None.
