# ADR-0042: Comments and the social boundary — the group chat is the social surface

- Status: Proposed
- Date: 2026-09-04
- Issue: #750
- Supersedes: None

## Context

The comments layer is a group-scoped persistent data model **and** a trust surface — two
independent ADR triggers — yet it has no governing ADR. The 2026-07-21 ADR audit (PR #746) flagged
this. It has also been re-architected repeatedly with the decisions recorded nowhere:

- **#688 / #701** retired the game-level emoji reaction bar.
- **#689 (PR #714)** repointed reactions onto comments as iMessage-style tapbacks
  (`supabase/src/schemas/0220_reactions_repoint_comments.sql`).
- **#832 (2026-08-14)** switched per-game comments off in the UI, recording in the DESIGN.md
  decision note: *"the group chat is where banter lives and the app should feed it, not compete
  with it. Nothing underneath was deleted (table, RLS, API route, #689's reactions repoint), so
  re-enabling is one PR."*

What exists today, verified in source (2026-09-04):

- `supabase/src/schemas/0215_comments.sql` — `comments` is `(group_id, user_id, game_id, body)`,
  group-scoped, non-blank body check, **flat**: no `parent_id`, reply, or thread column. There is
  no UPDATE policy, so bodies are immutable once posted.
- `supabase/src/schemas/0217_comments_deleted_at.sql` — soft delete (`deleted_at`).
- `supabase/src/schemas/0216_reactions.sql` + `0220_reactions_repoint_comments.sql` — reactions are
  tapbacks hanging off a comment (`comment_id`), one per (user, comment, emoji); not a game-level
  primitive.
- `supabase/src/policies/41_policies_comments_reactions.sql`:
  - **Reads gated post-kickoff** — `sel_comments_member_post_kickoff`: `is_member(group_id) AND
    game_has_started(game_id) AND deleted_at IS NULL`; reactions mirror the gate transitively via
    their parent comment.
  - **Inserts allowed anytime** for members — no write-side kickoff gate.
  - **`del_comments_own`** — only the author may delete; every policy is `user_id = auth.uid()`
    scoped to own rows. No commissioner, moderator, or admin override exists.
- **UI:** no Svelte component renders comments or reactions (#832). The API routes
  (`api/comments/[gameId]`, `api/reactions/[commentId]`) and the `getCommentsForGame` /
  `getReactionsForComments` queries are retained; re-enabling is one PR.

The decision pressure: the app has **no moderation path**, the social surface is **deliberately the
group chat rather than comments**, and the **post-kickoff read gate is an undocumented integrity
coupling**. All three are very likely correct for a private room of a few known friends
(PRODUCT.md lens 3), but each is currently discoverable only by reading an RLS file or a design
note, and every future social feature inherits them silently. Timing forces the record now: the app
is pre-launch (a beta wider than the original room), and #156 ("flip group-creation to open") would
change the room-size assumption all three stances rest on.

A 2026-09-04 pressure-test of *"re-enable comments and add threads on live games"* returned **Drop**:
a comment/thread surface competes with the group chat that PRODUCT.md's heart and ADR-0019 §5
(comments = "the weakest surface, most redundant with a plain group chat") say the app must *feed*,
not replace; threads specifically fragment the single group conversation into many per-game threads,
the anti-pattern for a small known room. That verdict is part of what this ADR records.

This meets the ADR trigger test on three counts: a persistent data model, an authorization
boundary (who may delete), and a coupling to gameplay-fairness (the read gate mirrors ADR-0019's
sealed reveal).

## Decision

Record the comments / social boundary as it actually stands. This is a record-what-is decision plus
named revisit triggers; it changes no behaviour.

1. **The group chat is the social surface; per-game comments are deliberately off** (#832). The app
   feeds the group conversation rather than hosting a competing one (PRODUCT.md heart; ADR-0019 §5).
   The data path is retained, so this is a product stance, not a deletion.
2. **Reactions are tapbacks that hang off a comment** (#688 / #689), not a standalone game-level
   primitive.
3. **The post-kickoff read gate is a durable integrity invariant, whether or not the UI is enabled.**
   `game_has_started()` on comment reads is inherited from the sealed-reveal model (ADR-0019) so
   comments cannot leak pick context before lock — an *integrity* mechanism, not a UI preference.
   Any future comment surface must preserve it structurally, at the RLS/view layer, not by UI
   omission.
4. **Deletion is author-only, deliberately.** No commissioner or moderator override, because the
   room is small and known (lens 3). This is a defended choice, not an oversight.
5. **Soft delete is the retention model.** Comment bodies survive `deleted_at`. On account deletion,
   the ADR-0004 cascade applies: `comments.user_id` and `reactions.user_id` are
   `ON DELETE CASCADE` to `users`, so a deleted account's comments and reactions are hard-removed
   (and each comment's reactions cascade in turn), rather than left as soft-deleted orphans.
6. **The re-enable stance is recorded, not left open.** The 2026-09-04 pressure-test Dropped
   "re-enable comments + threads." If the surface is ever revisited, the named on-brand alternative
   is **live-moment reactions on the revealed board that feed the chat** — never a parallel
   conversation surface. Any proposal to re-enable comments or add a comment surface must (a)
   preserve the post-kickoff read gate (point 3) and (b) clear a fresh `pressure-test` against
   "feed the chat, don't compete with it," and any UI form goes through a `design-study` first.

**Named revisit triggers.** Re-examine points 1 and 4 when either holds:

- the active room grows past **~15 members in a single group** (beyond the known-friends scale the
  stances assume), or
- **#156 opens self-service group creation**, so groups can contain strangers rather than known
  friends.

Adding a commissioner-delete or re-enabling a comment surface later is additive and cheap; this ADR
declines to build either now.

**Explicitly out of scope:** building moderation, threads, mentions, pinning, or reporting;
re-enabling comments; changing any current behaviour.

## Consequences

**Helpful:**

- The comments-off and no-moderation stances become defended choices instead of apparent
  oversights, and the reactions-as-tapbacks decision gains a record.
- The post-kickoff read gate gains a citeable integrity reason (ADR-0019) so it is not casually
  removed by a future "comment on the week" feature.
- Future social features inherit a stated boundary and an explicit obligation (preserve the gate,
  pass a pressure-test) rather than re-litigating the sealed promise each time.

**Costs:**

- One more ADR to maintain, and naming revisit triggers creates a small obligation to actually check
  them when the room grows or #156 lands.
- The comments-off stance is a product bet; if a real need for an in-app conversation surface
  emerges, this ADR must be superseded rather than quietly ignored.

**Migration/rollback:** docs-only. No schema, policy, or behaviour change; nothing to migrate.

## Alternatives considered

- **No ADR — leave it implicit.** Rejected: the no-moderation stance stays discoverable only by
  reading RLS, and the read-gate coupling stays an undocumented integrity dependency a future
  feature can silently break.
- **Record the stance and add a commissioner override now.** Rejected as premature — it builds
  anti-abuse machinery for a problem a few known friends do not have (lens 3), and it is cheap to
  add later behind the named revisit trigger.
- **Re-enable comments and add threads on live games.** Rejected by the 2026-09-04 pressure-test
  (Drop): competes with the group chat (heart / ADR-0019 §5); threads fragment the single
  conversation (lens 3, hardest); reversible-cheap (#832) argues against building speculatively now.
- **Broaden into a general "social layer" ADR** covering future mentions, pinning, and reporting.
  Rejected as speculative — record what was decided, not what might be.

## Follow-up

- **#156** (open group creation) — the primary revisit trigger for points 1 and 4; re-examine this
  ADR when it lands.
- **Reshape path** — if the live-reveal moment is revisited, run `design-study` + `pressure-test` on
  live-moment reactions that feed the chat, citing this ADR's point 6, before any build.
- **ADR-0019** — any reveal-adjacent comment surface is checked against its sealed-reveal boundary
  and the counts-only carve-out, not assumed.
