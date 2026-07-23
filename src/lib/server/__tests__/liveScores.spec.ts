import { describe, it, expect, vi, beforeEach } from 'vitest';

// `liveScores.ts` pulls server-only deps at import (Sentry + the Supabase service client);
// `selectLiveScores` itself is pure, so stub them so the module loads under jsdom.
vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));
vi.mock('$lib/supabase/service', () => ({ supabaseService: {} }));
vi.mock('../db/queries/findActiveWeek', () => ({ findActiveWeek: vi.fn() }));

import {
  selectLiveScores,
  isActiveWeekLiveCached,
  __resetActiveWeekLiveCache,
  type WeekGameForLive
} from '../liveScores';
import { findActiveWeek } from '../db/queries/findActiveWeek';
import type { EspnGame } from '../schedule';
import { LIVE_WINDOW_MS } from '$lib/live/config';

const NOW = Date.parse('2026-10-12T20:00:00Z');

function espn(overrides: Partial<EspnGame> & { scheduleGameId: string }): EspnGame {
  return {
    date: '2026-10-12T17:00Z',
    homeTeamAbbr: 'PHI',
    awayTeamAbbr: 'KC',
    homeScore: 14,
    awayScore: 10,
    status: 'in_progress',
    displayClock: '12:47',
    period: 2,
    ...overrides
  };
}

function weekGame(overrides: Partial<WeekGameForLive> & { id: string }): WeekGameForLive {
  return {
    scheduleGameId: `espn-${overrides.id}`,
    // Default: kicked off an hour ago → inside the live window.
    commenceTimeMs: NOW - 60 * 60 * 1000,
    ...overrides
  };
}

describe('selectLiveScores', () => {
  it('maps an in-progress ESPN game onto our game id with clock/period', () => {
    const games = [weekGame({ id: 'g1', scheduleGameId: 'e1' })];
    const espnGames = [espn({ scheduleGameId: 'e1', homeScore: 21, awayScore: 17 })];

    expect(selectLiveScores(games, espnGames, NOW)).toEqual({
      g1: {
        homeScore: 21,
        awayScore: 17,
        status: 'in_progress',
        displayClock: '12:47',
        period: 2
      }
    });
  });

  it('surfaces a final game as unofficial (Final — unofficial) with no clock', () => {
    const games = [weekGame({ id: 'g1', scheduleGameId: 'e1' })];
    const espnGames = [
      espn({
        scheduleGameId: 'e1',
        status: 'final',
        homeScore: 27,
        awayScore: 20,
        displayClock: null,
        period: null
      })
    ];

    expect(selectLiveScores(games, espnGames, NOW).g1).toMatchObject({
      status: 'final',
      homeScore: 27,
      displayClock: null,
      period: null
    });
  });

  it('drops a game whose kickoff is beyond the live window (graded result supersedes)', () => {
    const games = [
      weekGame({
        id: 'g1',
        scheduleGameId: 'e1',
        commenceTimeMs: NOW - (LIVE_WINDOW_MS + 60_000) // just past the window
      })
    ];
    const espnGames = [espn({ scheduleGameId: 'e1', status: 'final' })];

    expect(selectLiveScores(games, espnGames, NOW)).toEqual({});
  });

  it('drops a game that has not kicked off yet', () => {
    const games = [
      weekGame({ id: 'g1', scheduleGameId: 'e1', commenceTimeMs: NOW + 60 * 60 * 1000 })
    ];
    const espnGames = [espn({ scheduleGameId: 'e1', status: 'scheduled' })];

    expect(selectLiveScores(games, espnGames, NOW)).toEqual({});
  });

  it('null-guards a game with no schedule_game_id (synced before the column / via odds path)', () => {
    const games = [weekGame({ id: 'g1', scheduleGameId: null })];
    const espnGames = [espn({ scheduleGameId: 'e1' })];

    expect(selectLiveScores(games, espnGames, NOW)).toEqual({});
  });

  it('ignores ESPN games with a scheduled/postponed status or a missing score', () => {
    const games = [
      weekGame({ id: 'g1', scheduleGameId: 'e1' }),
      weekGame({ id: 'g2', scheduleGameId: 'e2' }),
      weekGame({ id: 'g3', scheduleGameId: 'e3' })
    ];
    const espnGames = [
      espn({ scheduleGameId: 'e1', status: 'scheduled', homeScore: null, awayScore: null }),
      espn({ scheduleGameId: 'e2', status: 'postponed' }),
      espn({ scheduleGameId: 'e3', status: 'in_progress', homeScore: null }) // score not yet posted
    ];

    expect(selectLiveScores(games, espnGames, NOW)).toEqual({});
  });
});

describe('isActiveWeekLiveCached', () => {
  // The wrapper feeds the Week nav tab's pulse dot on every authenticated page load (#776) —
  // the memo is what keeps that nav-wide read off the per-navigation DB hot path. The offseason
  // path (no active week) exercises it without a Supabase double: `findActiveWeek` returning
  // null resolves false after that single read.
  beforeEach(() => {
    __resetActiveWeekLiveCache();
    vi.mocked(findActiveWeek).mockReset();
  });

  it('memoizes within the TTL — ≤1 DB check per window however many viewers navigate', async () => {
    vi.mocked(findActiveWeek).mockResolvedValue(null);

    expect(await isActiveWeekLiveCached(NOW)).toBe(false);
    expect(await isActiveWeekLiveCached(NOW + 1_000)).toBe(false);

    expect(findActiveWeek).toHaveBeenCalledTimes(1);
  });

  it('re-checks once the TTL has elapsed', async () => {
    vi.mocked(findActiveWeek).mockResolvedValue(null);

    await isActiveWeekLiveCached(NOW);
    await isActiveWeekLiveCached(NOW + 31_000); // past the 30s TTL

    expect(findActiveWeek).toHaveBeenCalledTimes(2);
  });
});
