# ADR-0009: Global picks — write-time fan-out to all active groups

- Status: Accepted
- Date: 2026-06-25
- Issue: #214
- Supersedes: None

## Context

ADR-0002 established the per-group picks data model: picks are keyed `(group_id, user_id,
game_id)`, membership is the RLS boundary, and each group owns its own gameplay config
(including `line_source`). That model is already fully built and in production; v2.0 shipped
self-service multi-group (group creation, invites, join-via-invite #149, group switcher #150).

With multiple groups now real, a player who belongs to more than one group must navigate
group-by-group to re-enter the same picks each week. The pick input is purely personal — side
and weight do not vary by group — so the repetition is friction with no game-design value.

This decision governs how the pick-submission model changes to eliminate that friction, and
specifically how it interacts with three group-owned constraints:

1. **Per-group `line_source`**: each group may use a different odds book; the locked-line
   snapshot must reflect each group's configured book.
2. **All-In rule**: a player may use the All-In weight (`A`) at most once per week per group.
3. **Sealed-envelope reveal**: other members' picks are hidden until kickoff, scoped per-game
   per-group by existing RLS.

The decision also covers how the picks UI should frame the split between always-on broadcast
input and group-scoped reveal/banter.

ADR-0002's follow-up explicitly states that "fairness-sensitive gameplay decisions each require
their own ADR." `docs/adr/README.md`'s trigger test is met on two counts: this changes
gameplay fairness (All-In enforcement must hold across all groups simultaneously) and introduces
a new cross-cutting pick-submission pattern (write-time fan-out).

## Decision

### 1. Stateless write-time fan-out — no new tables

Pick submission fans out to all active group memberships of the calling player at write time.
Each active group gets its own pick row (the existing per-group storage), so grading,
leaderboard, and stats queries are completely unchanged. There is no new "global pick" entity.

### 2. Side and weight are identical across groups (Option 1)

A pick's team side and weight are the same in every group. A player does not choose different
weights per group in the same submission. The locked-line snapshot (`locked_spread_value`,
`locked_spread_team_id`, `locked_line_id`) may differ per group because it is resolved from
each group's `line_source` at write time.

Per-pick group divergence (Option 2: a default-on broadcast the player can opt out of per pick)
is the documented fast-follow if per-group All-In demand makes identical weights untenable. It
is purely additive on the same per-group storage and is tracked as a separate spawned issue.

### 3. New SECURITY INVOKER RPCs — `lock_pick_all_groups` / `unlock_pick_all_groups`

Fan-out is implemented as two new SQL functions in `supabase/src/functions/picks/`. Both must
be **SECURITY INVOKER** (not SECURITY DEFINER) so RLS enforces `(group_id, user_id, game_id)`
write permission on each group membership row individually. The functions:

- enumerate all *active* memberships of `auth.uid()` (inactive/pending memberships are skipped);
- for each group, resolve the active line from that group's `line_source` (via `group_config`);
- enforce the per-group All-In rule exactly as `lock_pick.sql` does today;
- upsert `on conflict (group_id, user_id, game_id) do update` (idempotent re-locks);
- return a per-group report `(group_id, ok, reason)` so partial-apply is surfaced to the client.

The existing single-group `lock_pick` / `unlock_pick` RPCs are **kept unchanged** (used by
the Option-2 per-pick divergence path and by any internal callers).

### 4. Conflict handling: apply-where-valid, report skips

A conflict (no active line for this group's book, All-In already used in this group, etc.)
does **not** abort the entire fan-out. The function skips that group, records the reason in
the report, and continues to the remaining groups. The client surfaces a non-blocking
`saveError` on partial-apply; full success is silent.

### 5. Group-first picks page — broadcast input, switcher-scoped reveal

The picks page is framed group-first:

- **Input section** (pre-kickoff, personal): the spread shown is the switched group's line
  (the "reveal lens"). The picks the player enters fan out to all groups automatically. When
  a player is in more than one active group, a persistent banner on the input section reads
  "Your picks apply to all N of your groups." There is no per-pick group selector in v1.
- **Reveal section** (post-kickoff): other members' picks, comments, and reactions are scoped
  to the switched group via the group switcher. The sealed-envelope mechanic (RLS
  `sel_picks_owner_or_started`) is unchanged.

The leaderboard (Standings + Weekly breakdown) is unchanged; it remains a secondary standings
view. The picks page is the daily-driver social hub.

## Consequences

**Helpful:**

- Zero repetition for multi-group players — one save, every group updated.
- Grading, leaderboard, stats, and RLS are completely untouched — all read the same per-group
  rows they already do.
- Conflict handling is non-blocking and transparent; partial-apply is reported, not silently lost.
- Option 2 (per-pick divergence) remains a clean additive extension; this decision forecloses
  nothing architecturally.
- The sealed-envelope fairness guarantee holds per game per group — no cross-group information
  leaks before kickoff.

**Costs:**

- A player who joins a new group mid-week will not have picks in that group for games already
  past. Re-saving re-broadcasts (idempotent upsert), but earlier games that have already kicked
  off cannot be backdated. Tracked as a follow-up (join-time backfill or pick-union read).
- The picks page shows the input spread for the switched group's `line_source`; other groups
  may snapshot a slightly different line (if books diverge). This is accurate and expected
  per the per-group config model, but may feel surprising. A tooltip or help text can clarify;
  tracked as a UX follow-up.
- Adding a new active group membership mid-session means the next pick save fans out to the
  new group; the old pick (before joining) is absent in the new group. Consistent with the
  mid-week join edge case above.

## Alternatives considered

- **Global pick entity (new table):** a single `global_picks` row that grading queries
  join-expand at read time. Rejected: changes the grading query surface and all downstream
  analytics, adds a new persistent entity with its own RLS, and complicates the All-In
  enforcement (All-In is per-group, so a global row cannot carry a single weight).
- **Option 2 (per-pick divergence) as the v1 default:** build the "broadcast but opt-out per
  pick" toggle from day one. Rejected: adds UI complexity before the use case (per-group
  All-In demand) is confirmed. Documented as fast-follow instead.
- **Read-union pick resolution (fan out at read time, not write time):** store one global
  pick, expand it at read time to appear per-group. Same grading/analytics concerns as the
  global-table alternative; also inconsistent with the locked-line-snapshot model (each group
  must snapshot its own book's line at the moment of locking).
- **Prompt the user per group on each submission:** show a "which groups?" selector every
  time a pick is locked. Rejected: re-introduces the friction this feature is eliminating; the
  always-on broadcast with a clear banner is the simpler model.

## Follow-up

- **Option 2 — per-pick group opt-out divergence:** additive, keyed to confirmed per-group
  All-In demand. Separate issue, purely additive on the same storage; `lock_pick` /
  `unlock_pick` provide the single-group primitives it needs.
- **Join-time backfill:** when a player joins a group mid-week, back-fill the current week's
  already-locked picks. Non-trivial (must respect each game's kickoff status); deferred to a
  follow-up issue.
- **Line-source divergence tooltip / UX clarification:** for the edge where books quote
  meaningfully different spreads.
- Implementation serializes against the migration ledger and generated `src/lib/types/supabase.ts`
  per `docs/WORKFLOW.md` DB rules. Gated on ADR-0009 being Accepted (this document) before
  any implementation branch opens.
