// The Tuesday-to-Tuesday window an NFL week is stored with (`weeks.start_ts` / `end_ts`).
//
// An NFL week runs Tuesday morning through Monday night in **US Eastern** time, so the
// boundary has to be anchored in that zone rather than in UTC. A Monday-night kickoff is
// 8:15pm ET, which is already 00:15 on *Tuesday* in UTC — so the old UTC-anchored "snap
// forward to the next Tuesday 00:00" overshot by a full week and produced 14-day windows
// that overlapped the following week (#791: every 2026 week 1-17 in prod; 2022-2025 escaped
// only because those seasons were imported, never produced by `syncSchedule`).
//
// Two consumers depend on the window being exactly one week and gapless with its
// neighbours:
//
//   * `findRecentGradableWeeks()` grades the active week plus the most-recently-*ended*
//     one. Under a 7-day overlap the just-finished week was neither — still open, yet
//     outranked on `start_ts` — so the grade cron worked on week `m` and week `m-2` and
//     every completed week (with it, standings and the whole weekly story) ran 7 days late.
//   * `findActiveWeek()` decides which week is live. Anchoring in Eastern also fixes a
//     second, pre-existing hole: under UTC the next week went active at 00:00 UTC, i.e.
//     15 minutes *before* Monday Night Football kicked off, which took the live sweat
//     board (#386), that game's pick reminder and its odds sync with it.
//
// DST is resolved through the IANA zone rather than a fixed offset, so the week containing
// a clock change is simply 7 days ± 1 hour. Windows stay gapless and non-overlapping across
// it, because both ends of every window are derived by the same rule.

const NFL_TIME_ZONE = 'America/New_York';
const TUESDAY = 2; // Date#getUTCDay(): 0 = Sunday

const easternFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: NFL_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

// Milliseconds to add to a UTC instant to read it as Eastern wall-clock time (negative for
// ET: -4h on EDT, -5h on EST). Derived from the zone database rather than hard-coded so the
// March/November transitions need no special case.
function easternOffsetMs(instant: number): number {
  const parts = easternFormat.formatToParts(instant);
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wallAsUtc = Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    field('hour') % 24, // some ICU builds render midnight as hour 24
    field('minute'),
    field('second')
  );
  return wallAsUtc - instant;
}

// The UTC instant at which an Eastern calendar day begins (00:00 ET). Out-of-range day
// numbers are normalised by Date.UTC, so callers can pass `day - 5` or `day + 7` directly.
function easternMidnight(year: number, month: number, day: number): number {
  const wall = Date.UTC(year, month - 1, day);
  // The offset in force at the naive instant is right except within a few hours of a DST
  // change; re-resolving against that first guess settles it. 00:00 ET is never inside a
  // US spring-forward gap (those happen at 02:00), so one refinement is enough.
  const guess = wall - easternOffsetMs(wall);
  return wall - easternOffsetMs(guess);
}

// Eastern wall-clock calendar fields for a UTC instant.
function easternDay(instant: number) {
  const wall = new Date(instant + easternOffsetMs(instant));
  return {
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
    weekday: wall.getUTCDay()
  };
}

/** Tuesday 00:00 Eastern on or before `instant`, as a UTC epoch. */
export function easternWeekStart(instant: number): number {
  const { year, month, day, weekday } = easternDay(instant);
  return easternMidnight(year, month, day - ((weekday - TUESDAY + 7) % 7));
}

/** The first Tuesday 00:00 Eastern strictly after `instant`, as a UTC epoch. */
export function easternWeekEnd(instant: number): number {
  const { year, month, day } = easternDay(easternWeekStart(instant));
  return easternMidnight(year, month, day + 7);
}

/**
 * Derive a week's window from its kickoff timestamps: back to the Tuesday 00:00 ET on or
 * before the first kickoff, forward to the first Tuesday 00:00 ET after the last one.
 *
 * No grace period is added past the final kickoff. Monday Night Football starts 8:15pm ET
 * and the boundary lands ~3h45m later, so the game plays out inside its own week; adding a
 * "game is over" cushion would push the boundary past midnight ET and re-create the
 * week-long overshoot this rule exists to remove.
 */
export function weekBoundaries(timestamps: number[]): { startTs: string; endTs: string } {
  return {
    startTs: new Date(easternWeekStart(Math.min(...timestamps))).toISOString(),
    endTs: new Date(easternWeekEnd(Math.max(...timestamps))).toISOString()
  };
}
