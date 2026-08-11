# ADR-0039: Joining is the only participation boundary

- Status: Proposed
- Date: 2026-08-11
- Issue: #782
- Supersedes: [ADR-0037](0037-participation-boundary.md) (rulings 4 and 5 only — the
  editable-until-first-kickoff commissioner control and the "offer a future week" creation
  UX; rulings 1, 2, 3, and 6 are retained unchanged)

## Context

[ADR-0037](0037-participation-boundary.md) established that a `(group, member, game)` triple
is eligible for settlement iff
`game.commence_time >= greatest(groups.competition_starts_at, group_memberships.joined_at)`,
and layered two commissioner-facing controls on the first term: ruling 4 (the start is
editable until the first eligible kickoff, then frozen) and ruling 5 (creation defaults to
now and may instead pick a future week). Both shipped in #725.

Investigation on 2026-07-25 (#782) found the controls are dead UI, and one of them gives a
wrong answer:

1. **The frozen state is computed against the include-all sentinel.**
   `public.competition_start_frozen()` asks only whether any game in the whole `games` table
   kicks off between `groups.competition_starts_at` and `now()`. It never joins `weeks` and
   never scopes to a season. Production's only league carries the ruling-3 backfill sentinel
   `2000-01-01Z`, so all 1,088 already-played games (2022–25) fall inside the window and the
   predicate is permanently true. `supabase/src/schemas/0235_participation_boundary.sql`
   warns against exactly this comparison: the sentinel means "this row has no explicit
   start", and must never be read as a date a league actually began. The card can only ever
   render "Play is underway".

2. **The predicate ignores `weeks.is_scoring`.** The 2026 schedule's first kickoff is a
   preseason game on Aug 7, five weeks before Week 1. Any league created before then would
   lock its start on a round that
   [ADR-0016](0016-non-scoring-rounds.md) defines as never counting toward standings — a
   wrong answer, not merely wrong wording.

3. **The `competition_starts_at` term is inert for every real path.**
   `group_memberships.joined_at` defaults to `now()` and neither `create_group` nor
   `redeem_invite` overrides it, and `create_group` additionally clamped the start up to
   `now()`. Every join is therefore at or after its league's creation, which makes
   `greatest(competition_starts_at, joined_at) = joined_at`. The column changes the answer
   **only** on the deferred-start branch — the one rulings 4 and 5 exist to serve.

The product rule we want is the one the `joined_at` term already delivers on its own: join,
start playing immediately, nothing before your join counts against you. Keeping rulings 4
and 5 would mean repairing a season-scoped, `is_scoring`-aware freeze predicate to keep a
control that no user can act on — under `group_creation_mode = 'gated'` a single account can
create a league, and the manage card is reachable only by commissioners of the one league
where it is permanently frozen.

## Decision

**Joining is the only participation boundary a user can set.** A league begins the moment it
is created; a member's participation begins the moment they join.

**1. Retire the commissioner start control (supersedes ADR-0037 ruling 4).**
`public.set_competition_start` and `public.competition_start_frozen` are dropped along with
their grants, the `/api/group/set-competition-start` endpoint, and the "Competition start"
card on `/league/manage`. There is no editable-until-kickoff window because there is nothing
to edit.

**2. Retire the creation-time start-week choice (supersedes ADR-0037 ruling 5).**
`public.create_group` takes a single `p_name text` argument. `groups.competition_starts_at`
is left to its column default, `now()`. The `/join` create-league form loses its start-mode
radios and week `<select>`, and posts no `competition_start` field.

**3. The boundary formula itself does not move.** `groups.competition_starts_at` keeps its
`not null default now()`, `public._participation_start` is unchanged, and ADR-0037 rulings
1, 2, 3, and 6 stand exactly as accepted. The include-all sentinel rows are not rewritten.
The column stays because it is a real term of the grading predicate and of every
membership × games read surface; it simply has no user-facing writer any more.

## Consequences

- The commissioner console stops claiming "Play is underway" for a season that has not
  started, and the create-league form stops offering a choice whose only reachable outcome
  was the default.
- The Aug 7 preseason-lock defect (finding 2) cannot bite: there is no freeze predicate left
  to consult, so `is_scoring` never enters this decision.
- Nothing about grading, settlement, or already-settled history changes. The retained
  `greatest(...)` predicate produces identical results for every existing row, because every
  production membership already satisfies
  `greatest(competition_starts_at, joined_at) = joined_at`.
- We give up the ability to defer a league's start past its creation. A commissioner who
  wants a league to "begin in Week 5" now either creates it then or accepts that Weeks 1–4
  count for whoever joined. This is a deliberate trade: the capability was reachable by one
  account, was never exercised, and cost a predicate that was wrong in two ways.
- `groups.competition_starts_at` becomes a column with no application writer. It is a
  documented term of the boundary, not dead weight — but a future reader must not infer from
  its presence that a per-league start is still settable.
- Restoring a deferred start later is a new ADR plus a season-scoped, `is_scoring`-aware
  freeze predicate — not a revert of this one. The column surviving is what keeps that door
  open cheaply.

## Alternatives considered

- **Fix the predicate instead of retiring the control.** Scope
  `competition_start_frozen` to the league's season and to `is_scoring` weeks, and stop
  comparing against the sentinel. Rejected: it is real work to preserve a control with no
  user who can act on it, and finding 3 shows the underlying capability (a start deferred
  past creation) is the only thing it buys — a capability nobody has asked for.
- **Keep `create_group`'s second argument but make it inert.** Rejected: an argument that is
  accepted and ignored is worse than no argument, and leaving the two-arg overload in place
  alongside a one-arg form would make every single-argument call ambiguous.
- **Drop `groups.competition_starts_at` entirely.** Rejected: it would ripple into
  `_settlement_owed`, `find_unsettled_weeks`, the completeness guard, the #724 read
  surfaces, `src/lib/domain/participation.ts`, and three pgTAP suites for no behavioural
  gain — `greatest(sentinel, joined_at)` already equals `joined_at`.
- **Rewrite the sentinel rows to a real 2026 date.** Rejected: it would push four seasons of
  settled history outside the boundary for every membership × games read surface. The lock
  the manage card reports is, by accident, the correct outcome.

## Follow-up

- #782 — this decision and its implementation (RPC + endpoint + query + UI removal, the
  `create_group` signature change, and the `- Note:` back-reference on ADR-0037).
- No prod data change. Post-deploy spot check only: the sentinel rows are untouched and
  neither retired function exists.
