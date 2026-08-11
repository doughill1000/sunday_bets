// tests/integration/weekWindowGrading.test.ts
//
// #791 end-to-end: the week window written by `weekBoundaries()` decides what the grade
// cron can see, via `findRecentGradableWeeks()` (active week + most-recently-*ended* week).
//
// The unit spec (src/lib/server/__tests__/weekWindow.spec.ts) proves the windows themselves.
// This suite proves the consequence the issue is actually about — that with the corrected
// windows the just-completed week comes back out of Postgres, and with the shipped-to-prod
// 14-day windows it does not.
//
// The fixture is a four-week season laid out exactly like real 2026: a Thursday-night
// opener and a Monday-night closer that kicks off at 00:15 UTC on a TUESDAY. 2044 is chosen
// because its September weekdays line up with 2026's and it is far from every other suite's
// season year — `findRecentGradableWeeks()` queries `weeks` globally with no season filter,
// so the probe clock has to sit in a stretch of time no other fixture (or the prod clone a
// local `db:reset:local` leaves behind) owns.
//
// Each game is left non-final on purpose: that is the real failure mode (the Monday-night
// score is never fetched, because `refreshScoresForGames` only runs for the weeks this
// query returns) and it keeps the `excludeSettledPriorWeek` gate from short-circuiting on a
// week with no games at all.

import { describe, test, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServiceClient } from './_auth';
import { ensureTeams } from './fixtures/db';
import { weekBoundaries } from '../../src/lib/server/weekWindow';
import { findActiveWeek } from '../../src/lib/server/db/queries/findActiveWeek';
import { findRecentGradableWeeks } from '../../src/lib/server/db/queries/findRecentGradableWeeks';

const admin = createServiceClient();

const SEASON_YEAR = 2044;

// Kickoffs, in UTC. Every Monday-night closer is 8:15pm ET — 00:15 UTC on a Tuesday, the
// input that made the old UTC-anchored snap overshoot by a week.
const WEEKS = [
  { weekNumber: 1, kickoffs: ['2044-09-09T00:20:00Z', '2044-09-13T00:15:00Z'] },
  { weekNumber: 2, kickoffs: ['2044-09-16T00:15:00Z', '2044-09-20T00:15:00Z'] },
  { weekNumber: 3, kickoffs: ['2044-09-23T00:15:00Z', '2044-09-27T00:15:00Z'] },
  { weekNumber: 4, kickoffs: ['2044-09-30T00:15:00Z', '2044-10-04T00:15:00Z'] }
] as const;

// What prod actually holds for 2026, shifted onto this fixture's calendar: Tuesday 00:00
// UTC to Tuesday 00:00 UTC a fortnight later, each week overlapping the next by seven days.
const DEFECTIVE_WINDOWS: Record<number, { startTs: string; endTs: string }> = {
  1: { startTs: '2044-09-06T00:00:00Z', endTs: '2044-09-20T00:00:00Z' },
  2: { startTs: '2044-09-13T00:00:00Z', endTs: '2044-09-27T00:00:00Z' },
  3: { startTs: '2044-09-20T00:00:00Z', endTs: '2044-10-04T00:00:00Z' },
  4: { startTs: '2044-09-27T00:00:00Z', endTs: '2044-10-11T00:00:00Z' }
};

// The issue's probe table: each moment is shortly after one week's Monday-night game has
// finished, and that week is the one grading must not skip.
const PROBES = [
  { at: '2044-09-13T04:00:00Z', justCompleted: 1, expectedActive: 2 },
  { at: '2044-09-20T12:00:00Z', justCompleted: 2, expectedActive: 3 },
  { at: '2044-09-27T12:00:00Z', justCompleted: 3, expectedActive: 4 }
] as const;

let seasonId: number;
const weekIds = new Map<number, number>();
const gameIds: string[] = [];

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
  if (error || !existing) throw new Error(`weekWindowGrading: could not resolve ${SEASON_YEAR}`);
  return existing.id as number;
}

// Rewrite every fixture week's window in place. `weeks` upserts on (season_id, week_number)
// exactly as `upsertWeek` does in the sync path, which is also how the 2026 prod rows get
// corrected once the fix ships.
async function setWindows(mode: 'defective' | 'fixed') {
  for (const { weekNumber, kickoffs } of WEEKS) {
    const window =
      mode === 'defective'
        ? DEFECTIVE_WINDOWS[weekNumber]
        : weekBoundaries(kickoffs.map((k) => Date.parse(k)));
    const { error } = await admin
      .from('weeks')
      .update({ start_ts: window.startTs, end_ts: window.endTs })
      .eq('id', weekIds.get(weekNumber)!);
    if (error) throw new Error(`weekWindowGrading: set ${mode} window: ${error.message}`);
  }
}

async function weekNumbersReturnedAt(instant: string): Promise<number[]> {
  vi.setSystemTime(new Date(instant));
  // The grade cron's own call (`src/routes/(app)/api/cron/grade/+server.ts`).
  const weeks = await findRecentGradableWeeks({ excludeSettledPriorWeek: true });
  return weeks.map((w) => w.week_number).sort((a, b) => a - b);
}

beforeAll(async () => {
  await ensureTeams(admin);
  const { data: teams } = await admin
    .from('teams')
    .select('id, short_name')
    .in('short_name', ['KC', 'BUF']);
  if (!teams || teams.length < 2) throw new Error('weekWindowGrading: need KC + BUF teams');
  const homeTeamId = teams.find((t) => t.short_name === 'KC')!.id as number;
  const awayTeamId = teams.find((t) => t.short_name === 'BUF')!.id as number;

  seasonId = await upsertSeason();

  for (const { weekNumber, kickoffs } of WEEKS) {
    const window = weekBoundaries(kickoffs.map((k) => Date.parse(k)));
    const { data, error } = await admin
      .from('weeks')
      .upsert(
        {
          season_id: seasonId,
          week_number: weekNumber,
          start_ts: window.startTs,
          end_ts: window.endTs,
          is_scoring: true
        },
        { onConflict: 'season_id,week_number' }
      )
      .select('id')
      .single();
    if (error || !data)
      throw new Error(`weekWindowGrading: upsert week ${weekNumber}: ${error?.message}`);
    weekIds.set(weekNumber, data.id as number);

    // The Monday-night game, still awaiting its final score — the game the defect strands.
    const externalId = `wk791-${SEASON_YEAR}-w${weekNumber}`;
    await admin.from('games').delete().eq('external_game_id', externalId);
    const { data: game, error: gameError } = await admin
      .from('games')
      .insert({
        week_id: data.id as number,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        external_game_id: externalId,
        commence_time: kickoffs[kickoffs.length - 1],
        status: 'scheduled'
      })
      .select('id')
      .single();
    if (gameError || !game)
      throw new Error(`weekWindowGrading: insert game ${externalId}: ${gameError?.message}`);
    gameIds.push(game.id as string);
  }
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  vi.useRealTimers();
  if (gameIds.length > 0) await admin.from('games').delete().in('id', gameIds);
  if (weekIds.size > 0)
    await admin
      .from('weeks')
      .delete()
      .in('id', [...weekIds.values()]);
  await admin.from('seasons').delete().eq('year', SEASON_YEAR);
});

describe('week windows and what the grade cron can see (#791)', () => {
  // Only Date is faked. The Supabase client's own timers/timeouts must keep running or the
  // queries below never resolve.
  function freezeClock() {
    vi.useFakeTimers({ toFake: ['Date'] });
  }

  test('the reproduction: 14-day windows hide the week that just finished', async () => {
    freezeClock();
    await setWindows('defective');

    for (const { at, justCompleted, expectedActive } of PROBES) {
      const returned = await weekNumbersReturnedAt(at);
      // The active week is right; the week whose Monday-night game just ended is simply
      // gone — it is still "open" (its window runs another seven days) yet outranked on
      // start_ts, so it is neither candidate. The cron works on week m and week m-2.
      expect({ at, active: returned.includes(expectedActive) }).toEqual({ at, active: true });
      expect({ at, sees: returned.includes(justCompleted) }).toEqual({ at, sees: false });
    }
  });

  test('Eastern-anchored windows return it at every probe point', async () => {
    freezeClock();
    await setWindows('fixed');

    for (const { at, justCompleted, expectedActive } of PROBES) {
      const returned = await weekNumbersReturnedAt(at);
      expect({ at, returned }).toEqual({
        at,
        returned: [justCompleted, expectedActive].sort((a, b) => a - b)
      });
    }
  });

  test('Monday Night Football belongs to its own active week while it is on', async () => {
    // The second, pre-existing hole (#791): 00:00 UTC Tuesday is 15 minutes BEFORE the MNF
    // kickoff, so under UTC anchoring the NEXT week went active mid-game — taking the live
    // sweat board (#386), that game's pick reminder and its odds sync with it.
    freezeClock();
    const midGame = new Date('2044-09-13T02:00:00Z'); // Mon 10:00pm ET, week 1's MNF in play

    await setWindows('defective');
    vi.setSystemTime(midGame);
    expect((await findActiveWeek())?.week_number).toBe(2);

    await setWindows('fixed');
    vi.setSystemTime(midGame);
    expect((await findActiveWeek())?.week_number).toBe(1);
  });

  test('a week stays gradable for the whole cron tick that follows its last game', async () => {
    // Grading is not instantaneous at the boundary: the Tuesday crons run hours later, and
    // the week must still be the most-recently-ended one when they do.
    freezeClock();
    await setWindows('fixed');

    // 09:00 UTC Tuesday — after the grade cron's first post-MNF tick and before the
    // weekly-recap cron at 14:00 UTC.
    expect(await weekNumbersReturnedAt('2044-09-13T09:00:00Z')).toEqual([1, 2]);
    expect(await weekNumbersReturnedAt('2044-09-13T14:00:00Z')).toEqual([1, 2]);
  });
});
