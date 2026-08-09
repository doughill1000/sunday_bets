import { describe, it, expect } from 'vitest';
import { weekBoundaries } from '../weekWindow';

// #791. `weekBoundaries` used to snap the end of a week forward to "the next Tuesday 00:00
// UTC after the last kickoff + 4h". A Monday-night kickoff is 8:15pm ET = 00:15 UTC on
// TUESDAY, so that snap always added a whole extra week: prod's 2026 weeks 1-17 were each
// stored 14 days long, overlapping the following week. The fixtures below are the real
// per-week first/last kickoffs read out of production `public.games` for season 2026 — the
// exact input that produced the bad rows.
const KICKOFFS_2026: { week: number; first: string; last: string }[] = [
  { week: -4, first: '2026-08-27T23:00:00Z', last: '2026-08-29T22:00:00Z' },
  { week: -3, first: '2026-08-21T00:00:00Z', last: '2026-08-24T00:00:00Z' },
  { week: -2, first: '2026-08-13T23:00:00Z', last: '2026-08-16T00:00:00Z' },
  { week: -1, first: '2026-08-07T00:00:00Z', last: '2026-08-07T00:00:00Z' },
  { week: 1, first: '2026-09-10T00:20:00Z', last: '2026-09-15T00:15:00Z' },
  { week: 2, first: '2026-09-18T00:15:00Z', last: '2026-09-22T00:15:00Z' },
  { week: 3, first: '2026-09-25T00:15:00Z', last: '2026-09-29T00:15:00Z' },
  { week: 4, first: '2026-10-02T00:15:00Z', last: '2026-10-06T00:15:00Z' },
  { week: 5, first: '2026-10-09T00:15:00Z', last: '2026-10-13T00:15:00Z' },
  { week: 6, first: '2026-10-16T00:15:00Z', last: '2026-10-20T00:15:00Z' },
  { week: 7, first: '2026-10-23T00:15:00Z', last: '2026-10-27T00:15:00Z' },
  // Week 8 straddles the end of DST (Sun 2026-11-01): it opens on EDT and closes on EST.
  { week: 8, first: '2026-10-30T00:15:00Z', last: '2026-11-03T01:15:00Z' },
  { week: 9, first: '2026-11-06T01:15:00Z', last: '2026-11-10T01:15:00Z' },
  { week: 10, first: '2026-11-13T01:15:00Z', last: '2026-11-17T01:15:00Z' },
  { week: 11, first: '2026-11-20T01:15:00Z', last: '2026-11-24T01:15:00Z' },
  { week: 12, first: '2026-11-26T01:00:00Z', last: '2026-12-01T01:15:00Z' },
  { week: 13, first: '2026-12-04T01:15:00Z', last: '2026-12-08T01:15:00Z' },
  { week: 14, first: '2026-12-11T01:15:00Z', last: '2026-12-15T01:15:00Z' },
  { week: 15, first: '2026-12-18T01:15:00Z', last: '2026-12-22T01:15:00Z' },
  { week: 16, first: '2026-12-25T01:15:00Z', last: '2026-12-29T01:15:00Z' },
  { week: 17, first: '2027-01-01T01:15:00Z', last: '2027-01-05T01:15:00Z' },
  // Week 18 is unflexed at sync time — ESPN serves all 16 games at one placeholder kickoff.
  { week: 18, first: '2027-01-10T05:00:00Z', last: '2027-01-10T05:00:00Z' }
];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function windowFor(week: number) {
  const row = KICKOFFS_2026.find((k) => k.week === week);
  if (!row) throw new Error(`no 2026 fixture for week ${week}`);
  return weekBoundaries([Date.parse(row.first), Date.parse(row.last)]);
}

function spanMs(w: { startTs: string; endTs: string }) {
  return Date.parse(w.endTs) - Date.parse(w.startTs);
}

describe('weekBoundaries (#791)', () => {
  it('gives a Monday-night week a 7-day window, not 14', () => {
    // The headline regression. Prod stored 2026-09-08 -> 2026-09-22.
    expect(windowFor(1)).toEqual({
      startTs: '2026-09-08T04:00:00.000Z',
      endTs: '2026-09-15T04:00:00.000Z'
    });
  });

  it('keeps Monday Night Football inside its own week', () => {
    // The second, pre-existing hole: under UTC anchoring the next week went active at
    // 00:00 UTC, 15 minutes BEFORE the MNF kickoff, so the live sweat board (#386), that
    // game's pick reminder and its odds sync all went dark while it was being played.
    const week1 = windowFor(1);
    const mondayNightKickoff = Date.parse('2026-09-15T00:15:00Z');
    const roughlyFullTime = mondayNightKickoff + 3 * HOUR;

    expect(Date.parse(week1.startTs)).toBeLessThanOrEqual(mondayNightKickoff);
    expect(Date.parse(week1.endTs)).toBeGreaterThan(roughlyFullTime);
    // ...and the following week has not started yet while it is on.
    expect(Date.parse(windowFor(2).startTs)).toBeGreaterThan(roughlyFullTime);
  });

  it('is unchanged for a week with no Monday-night game', () => {
    // Preseason weeks never overlapped — they are why the defect stayed invisible until
    // the regular season. The window is the same Tuesday-to-Tuesday span as before, just
    // anchored at midnight Eastern instead of midnight UTC.
    expect(windowFor(-1)).toEqual({
      startTs: '2026-08-04T04:00:00.000Z',
      endTs: '2026-08-11T04:00:00.000Z'
    });
    expect(windowFor(18)).toEqual({
      startTs: '2027-01-05T05:00:00.000Z',
      endTs: '2027-01-12T05:00:00.000Z'
    });
  });

  it('anchors on Eastern midnight across the DST change', () => {
    // Week 7 closes on EDT (04:00Z), week 8 on EST (05:00Z) — so week 8 is 7 days + 1 hour
    // and the seam between them still lines up exactly.
    const week7 = windowFor(7);
    const week8 = windowFor(8);

    expect(week7.endTs).toBe('2026-10-27T04:00:00.000Z');
    expect(week8).toEqual({
      startTs: '2026-10-27T04:00:00.000Z',
      endTs: '2026-11-03T05:00:00.000Z'
    });
    expect(spanMs(week8)).toBe(7 * DAY + HOUR);
  });

  it('gives every real 2026 week a one-week span', () => {
    // Prod today: 5 weeks at 7 days (4 preseason + week 18) and 17 at 14.
    const spans = KICKOFFS_2026.map(({ week }) => ({ week, span: spanMs(windowFor(week)) }));
    const wrong = spans.filter(
      // 7 days, give or take the hour a DST change moves the far end by.
      (s) => s.span < 7 * DAY - HOUR || s.span > 7 * DAY + HOUR
    );
    expect(wrong).toEqual([]);
  });

  it('is gapless and non-overlapping across consecutive 2026 weeks', () => {
    // Both halves matter. A gap would strand a moment with no active week; an overlap is
    // the #791 defect itself — the just-finished week stays "open" while the next one
    // outranks it on start_ts, so it is neither the active week nor the most-recently-
    // ended one and `findRecentGradableWeeks()` never returns it.
    // Chronological, not by week_number: preseason counts DOWN (-1 is the Hall of Fame
    // game in early August, -4 the last tune-up before week 1).
    const consecutive = [...KICKOFFS_2026].sort(
      (a, b) => Date.parse(a.first) - Date.parse(b.first)
    );
    const seams = consecutive.slice(1).map((current, i) => {
      const previous = consecutive[i];
      return {
        from: previous.week,
        to: current.week,
        meets: windowFor(current.week).startTs === windowFor(previous.week).endTs
      };
    });

    // The preseason/regular-season seam has a real week of no football in it; every other
    // pair must meet exactly.
    expect(seams.filter((s) => !s.meets)).toEqual([{ from: -4, to: 1, meets: false }]);
    expect(Date.parse(windowFor(1).startTs)).toBeGreaterThan(Date.parse(windowFor(-4).endTs));
  });

  it('covers every kickoff it was derived from', () => {
    const uncovered = KICKOFFS_2026.filter(({ week, first, last }) => {
      const { startTs, endTs } = windowFor(week);
      return Date.parse(startTs) > Date.parse(first) || Date.parse(endTs) <= Date.parse(last);
    });
    expect(uncovered).toEqual([]);
  });

  it('leaves an already-correct Sunday-finishing slate at the same 7 days', () => {
    // The issue's control case: strip week 1's Monday-night game and the old UTC rule
    // produced the right answer. The Eastern anchor keeps the same span, four hours later.
    expect(
      weekBoundaries([Date.parse('2026-09-10T00:20:00Z'), Date.parse('2026-09-14T01:25:00Z')])
    ).toEqual({
      startTs: '2026-09-08T04:00:00.000Z',
      endTs: '2026-09-15T04:00:00.000Z'
    });
  });
});
