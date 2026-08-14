// tests/integration/weekSeasonAnchor.test.ts
//
// #824: /week defaulted to last season all preseason. `resolveSeasonYear` picks
// `max(availableSeasons)`, and `availableSeasons` is derived from the leaderboard matview,
// which filters `where w.is_scoring` (ADR-0016 boundary 1) — so a preseason round contributes
// no rows, its season never enters the list, and the "what just happened" tab pointed at a
// season that ended in January while the round people were actually playing sat one
// hand-edited URL away.
//
// The unit spec (src/lib/server/__tests__/seasonDefault.test.ts) proves the precedence rules.
// This suite proves the half that has to come out of Postgres: that `findStartedSeasonYear()`
// reads the season year through the `weeks -> seasons` embed, that "started" includes a
// NON-SCORING round, and that it degrades to the last season played rather than to null once
// the newest season is seeded but not yet under way.
//
// It owns season years 2062 (played) and 2063 (seeded, never started) and the stretch of the
// calendar between them: `findStartedSeasonYear()` queries `weeks` globally with no season
// filter, so — exactly like weekWindowGrading (#791) — the probe clock has to sit in a span
// no other fixture (or the prod clone a local `db:reset:local` leaves behind) owns. Other
// suites hold 2009/2024/2041/2044/2051/2073/2077/2087/2093/2095-2099.
//
// No games, picks or settlements: the anchor is decided by week windows alone, and giving it
// graded data would only obscure the point — the whole defect is that the season in play has
// nothing the matviews can see.

import { describe, test, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServiceClient } from './_auth';
import { findStartedSeasonYear } from '../../src/lib/server/db/queries/findStartedSeasonYear';
import { resolveLiveSeasonYear, resolveSeasonYear } from '../../src/lib/server/seasonDefault';
import { getSeasonWeekOptions } from '../../src/lib/server/weeklyPicks';

const admin = createServiceClient();

const PLAYED_YEAR = 2062;
const SEEDED_YEAR = 2063;

// 2062 laid out like a real season: a non-scoring preseason round in August, then week 1 in
// September. 2063 is what Schedule Sync leaves behind months early — a week that exists but
// has not started.
const FIXTURE = [
  {
    year: PLAYED_YEAR,
    weekNumber: -2,
    isScoring: false,
    startTs: '2062-08-08T04:00:00Z',
    endTs: '2062-08-15T04:00:00Z'
  },
  {
    year: PLAYED_YEAR,
    weekNumber: 1,
    isScoring: true,
    startTs: '2062-09-05T04:00:00Z',
    endTs: '2062-09-12T04:00:00Z'
  },
  {
    year: SEEDED_YEAR,
    weekNumber: 1,
    isScoring: true,
    startTs: '2063-09-04T04:00:00Z',
    endTs: '2063-09-11T04:00:00Z'
  }
] as const;

// The group's standings as the matviews would report them at each probe: 2062's preseason
// round is worth zero everywhere, so the newest season with rows is always the one BEFORE the
// season in play until week 1 grades.
const PRESEASON_AVAILABLE_SEASONS = [2061, 2060];

const seasonIds = new Map<number, number>();
const weekIds: number[] = [];

async function upsertSeason(year: number): Promise<number> {
  const { data: ins } = await admin.from('seasons').insert({ year }).select('id').single();
  if (ins) return ins.id as number;
  const { data: existing, error } = await admin
    .from('seasons')
    .select('id')
    .eq('year', year)
    .maybeSingle();
  if (error || !existing) throw new Error(`weekSeasonAnchor: could not resolve season ${year}`);
  return existing.id as number;
}

/** The anchor as `/week`'s load computes it, at a pinned instant. */
async function anchorAt(instant: string, rawSeason: string | null = null) {
  vi.setSystemTime(new Date(instant));
  const startedSeasonYear = await findStartedSeasonYear();
  return {
    startedSeasonYear,
    // `+page.server.ts`: currentSeasonYear is max(seasons.year), which Schedule Sync has
    // already bumped to the seeded season.
    seasonYear: resolveLiveSeasonYear(
      rawSeason,
      startedSeasonYear,
      PRESEASON_AVAILABLE_SEASONS,
      SEEDED_YEAR
    )
  };
}

beforeAll(async () => {
  for (const year of [PLAYED_YEAR, SEEDED_YEAR]) {
    seasonIds.set(year, await upsertSeason(year));
  }

  for (const { year, weekNumber, isScoring, startTs, endTs } of FIXTURE) {
    const { data, error } = await admin
      .from('weeks')
      .upsert(
        {
          season_id: seasonIds.get(year)!,
          week_number: weekNumber,
          start_ts: startTs,
          end_ts: endTs,
          is_scoring: isScoring
        },
        { onConflict: 'season_id,week_number' }
      )
      .select('id')
      .single();
    if (error || !data)
      throw new Error(`weekSeasonAnchor: upsert ${year} week ${weekNumber}: ${error?.message}`);
    weekIds.push(data.id as number);
  }
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  vi.useRealTimers();
  if (weekIds.length > 0) await admin.from('weeks').delete().in('id', weekIds);
  await admin.from('seasons').delete().in('year', [PLAYED_YEAR, SEEDED_YEAR]);
});

describe('/week anchors on the season in play (#824)', () => {
  // Only Date is faked. The Supabase client's own timers/timeouts must keep running or the
  // queries below never resolve.
  function freezeClock() {
    vi.useFakeTimers({ toFake: ['Date'] });
  }

  test('the reproduction: mid-preseason the browse default lands a season short', async () => {
    freezeClock();
    const { seasonYear } = await anchorAt('2062-08-11T16:00:00Z');

    // What `/week` used to do — and what /league, /stats, /market, /recap, /wrapped and
    // /league/manage still do on purpose, because for a browse surface it is correct.
    expect(resolveSeasonYear(null, PRESEASON_AVAILABLE_SEASONS, SEEDED_YEAR)).toBe(2061);
    // The round in play is a season newer than anything the matviews can see.
    expect(seasonYear).toBe(PLAYED_YEAR);
  });

  test('mid-preseason it opens on the non-scoring season, which has no standings at all', async () => {
    freezeClock();
    const { startedSeasonYear, seasonYear } = await anchorAt('2062-08-11T16:00:00Z');

    expect(startedSeasonYear).toBe(PLAYED_YEAR);
    expect(seasonYear).toBe(PLAYED_YEAR);
    expect(PRESEASON_AVAILABLE_SEASONS).not.toContain(PLAYED_YEAR);
  });

  test('the anchored season always has a week to show — the anchor week is one of its options', async () => {
    freezeClock();
    const { seasonYear } = await anchorAt('2062-08-11T16:00:00Z');

    const options = await getSeasonWeekOptions(seasonYear);
    // Only the preseason round has started, so it is both the only option and the selected
    // one (`latestWeek`), and it is labelled non-scoring so the breakdown shows the "This
    // round doesn't count" banner.
    expect(options).toEqual([expect.objectContaining({ weekNumber: -2, isScoring: false })]);
  });

  test('week 1 kicks off and it stays on that season, still before anything grades', async () => {
    freezeClock();
    const { seasonYear } = await anchorAt('2062-09-07T16:00:00Z');

    expect(seasonYear).toBe(PLAYED_YEAR);
    const options = await getSeasonWeekOptions(seasonYear);
    expect(options.map((w) => w.weekNumber)).toEqual([-2, 1]);
  });

  test('off-season, with the next season seeded but not started, it holds the last one played', async () => {
    freezeClock();
    // June: Schedule Sync has already published 2063's schedule and bumped max(seasons.year),
    // which is exactly the empty-summer trap `resolveSeasonYear` exists to avoid.
    const { startedSeasonYear, seasonYear } = await anchorAt('2063-06-01T16:00:00Z');

    expect(startedSeasonYear).toBe(PLAYED_YEAR);
    expect(seasonYear).toBe(PLAYED_YEAR);
    expect(seasonYear).not.toBe(SEEDED_YEAR);
  });

  test('an explicit ?season= still wins, so the #776 URL contract survives', async () => {
    freezeClock();
    // Browsing back to the previous season from the live preseason round has to stick.
    const { seasonYear } = await anchorAt('2062-08-11T16:00:00Z', '2061');

    expect(seasonYear).toBe(2061);
  });
});
