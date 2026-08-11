// tests/integration/upcomingWeek.test.ts
//
// #801: odds sync only ever fetched the ACTIVE week, so a slate could not hold a line
// until it was already live in the UI — every newly-active week rendered as all
// "No line" until the next cron landed. The fix primes the *upcoming* week, which
// needs a query that can name it, and naming it is the part with the trap.
//
// Preseason weeks count DOWN (ADR-0016): -1 is the Hall of Fame game and -4 the last
// tune-up, so the week after -2 is -3, and "the next higher week number" walks
// backwards into a week already played. `findUpcomingWeek` therefore orders on
// `start_ts`. This suite proves that against real Postgres, across a season laid out
// like 2026: four preseason rounds, then the regular-season opener.
//
// 2051 is chosen because no other fixture (or the prod clone a local `db:reset:local`
// leaves behind) owns any part of it: `findUpcomingWeek` queries `weeks` globally
// with no season filter, exactly like `findRecentGradableWeeks`, so the probe clock
// has to sit in a stretch of time this suite alone occupies.

import { describe, test, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServiceClient } from './_auth';
import { findActiveWeek } from '../../src/lib/server/db/queries/findActiveWeek';
import { findUpcomingWeek } from '../../src/lib/server/db/queries/findUpcomingWeek';

const admin = createServiceClient();

const SEASON_YEAR = 2051;

// Contiguous one-week windows, in chronological order. Note the week numbers run
// -1, -2, -3, -4, 1: descending, then a jump — the shape that breaks any ordering
// that is not on the clock.
const WEEKS = [
  { weekNumber: -1, startTs: '2051-08-01T04:00:00Z', endTs: '2051-08-08T04:00:00Z' },
  { weekNumber: -2, startTs: '2051-08-08T04:00:00Z', endTs: '2051-08-15T04:00:00Z' },
  { weekNumber: -3, startTs: '2051-08-15T04:00:00Z', endTs: '2051-08-22T04:00:00Z' },
  { weekNumber: -4, startTs: '2051-08-22T04:00:00Z', endTs: '2051-08-29T04:00:00Z' },
  { weekNumber: 1, startTs: '2051-08-29T04:00:00Z', endTs: '2051-09-05T04:00:00Z' }
] as const;

// Each probe is a moment inside one week; `upcoming` is the slate players will see
// next and the one odds sync now primes.
const PROBES = [
  { at: '2051-08-04T12:00:00Z', active: -1, upcoming: -2 },
  { at: '2051-08-11T12:00:00Z', active: -2, upcoming: -3 },
  // The preseason→regular boundary: the two weeks resolve to different Odds API
  // sport endpoints, which is why the sport key is derived per week.
  { at: '2051-08-25T12:00:00Z', active: -4, upcoming: 1 }
] as const;

let seasonId: number;
const weekIds: number[] = [];

async function upsertSeason(): Promise<number> {
  const { data: ins } = await admin
    .from('seasons')
    .insert({ year: SEASON_YEAR })
    .select('id')
    .single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('seasons')
    .select('id')
    .eq('year', SEASON_YEAR)
    .maybeSingle();
  if (error || !existing) throw new Error(`upcomingWeek: could not resolve ${SEASON_YEAR}`);
  return existing.id as number;
}

beforeAll(async () => {
  seasonId = await upsertSeason();

  for (const { weekNumber, startTs, endTs } of WEEKS) {
    const { data, error } = await admin
      .from('weeks')
      .upsert(
        {
          season_id: seasonId,
          week_number: weekNumber,
          start_ts: startTs,
          end_ts: endTs,
          is_scoring: weekNumber > 0
        },
        { onConflict: 'season_id,week_number' }
      )
      .select('id')
      .single();
    if (error || !data)
      throw new Error(`upcomingWeek: upsert week ${weekNumber}: ${error?.message}`);
    weekIds.push(data.id as number);
  }
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  vi.useRealTimers();
  if (weekIds.length > 0) await admin.from('weeks').delete().in('id', weekIds);
  await admin.from('seasons').delete().eq('year', SEASON_YEAR);
});

describe('findUpcomingWeek (#801)', () => {
  // Only Date is faked. The Supabase client's own timers must keep running or the
  // queries below never resolve.
  function freezeAt(instant: string) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(instant));
  }

  test('names the week that starts next, not the next week number', async () => {
    for (const { at, active, upcoming } of PROBES) {
      freezeAt(at);
      const pair = {
        at,
        active: (await findActiveWeek())?.week_number,
        upcoming: (await findUpcomingWeek())?.week_number
      };
      expect(pair).toEqual({ at, active, upcoming });
      vi.useRealTimers();
    }
  });

  test('the upcoming week has not started, so a line written to it is written early', async () => {
    // The point of the whole change: the primed week is one whose start_ts is still
    // in the future — a slate can now be lined before players ever see it.
    for (const { at } of PROBES) {
      freezeAt(at);
      const now = new Date(at);
      const week = await findUpcomingWeek();
      expect({ at, startsLater: new Date(week!.start_ts) > now }).toEqual({
        at,
        startsLater: true
      });
      vi.useRealTimers();
    }
  });
});
