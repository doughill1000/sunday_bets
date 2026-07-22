/**
 * The ADR-0037 participation boundary, in TypeScript.
 *
 * A (group, member, game) triple is eligible for settlement — a real pick or a missed
 * penalty — only when
 *
 *   game.commence_time >= greatest(groups.competition_starts_at, group_memberships.joined_at)
 *
 * Postgres owns the canonical definition in `public._participation_start` (see
 * `supabase/src/functions/_private/participation_start.sql`), which every SQL grading and
 * read surface calls. That function is SECURITY DEFINER and closed to the browser, and the
 * TS read surfaces that need the boundary already fetch `joined_at` / `competition_starts_at`
 * as ordinary columns — so this is the single sanctioned TS mirror of the rule, in the same
 * spirit as `liveCover`'s mirror of `grade_pick`. One copy here rather than an inline
 * comparison at each call site: if the rule ever changes, these are the only two places.
 *
 * Never a settlement authority — `pick_settlement` stays canonical. This exists so read
 * surfaces that enumerate membership × games themselves (#724) do not re-manufacture the
 * pre-participation obligations grading no longer writes.
 */

/**
 * The instant from which a (group, member) pair is eligible, as epoch milliseconds.
 *
 * Returns `null` when the boundary is unknown (either term missing), which callers must read
 * as "no boundary to apply" — the pre-ADR-0037 behaviour. That is the opposite of the SQL
 * helper's conservative NULL (which excludes), and deliberately so: the SQL helper's NULL
 * means "not a membership at all", whereas here it only ever means a caller did not supply
 * the columns, and silently blanking a whole roster would be far worse than the status quo.
 */
export function participationStartMs(
  competitionStartsAt: string | null | undefined,
  joinedAt: string | null | undefined
): number | null {
  const competition = toMs(competitionStartsAt);
  const joined = toMs(joinedAt);
  if (competition === null && joined === null) return null;
  return Math.max(competition ?? Number.NEGATIVE_INFINITY, joined ?? Number.NEGATIVE_INFINITY);
}

/**
 * Did this game start on or after the member's participation began?
 *
 * `participationStart` is the epoch-ms value from {@link participationStartMs}; `null` (an
 * unknown boundary) is eligible, per the note above.
 */
export function isWithinParticipation(
  commenceTime: string | null | undefined,
  participationStart: number | null | undefined
): boolean {
  if (participationStart == null) return true;
  const kickoff = toMs(commenceTime);
  if (kickoff === null) return true;
  return kickoff >= participationStart;
}

/** One active membership's boundary inputs (ADR-0037): the league's competition start and the
 *  member's join, both raw ISO columns. */
export type GroupBoundary = {
  competitionStartsAt: string | null;
  joinedAt: string | null;
};

/**
 * Should a member be reminded to pick this game (ADR-0037)?
 *
 * The pick-reminder fan-out enumerates games × members itself, so — like the Weekly grid — it
 * must honour the participation boundary rather than nag a member about a game that isn't theirs:
 * a league created to start a future week should not remind its members about the games before
 * that start. A game is remindable if it is within participation in *at least one* of the
 * member's active leagues (a member of both a running and a not-yet-started league is still owed
 * their running one). With no boundary data supplied (an unusual no-membership caller), it stays
 * remindable — the pre-ADR behaviour — since silently muting is worse than the status quo.
 */
export function isGameRemindable(
  commenceTime: string | null | undefined,
  groupBoundaries: GroupBoundary[]
): boolean {
  if (groupBoundaries.length === 0) return true;
  return groupBoundaries.some((b) =>
    isWithinParticipation(commenceTime, participationStartMs(b.competitionStartsAt, b.joinedAt))
  );
}

/**
 * Timestamps arrive as ISO strings with varying offsets and sub-second precision, so they are
 * compared as instants rather than lexically.
 */
function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}
