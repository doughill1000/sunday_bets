import { describe, it, expect, vi, beforeEach } from 'vitest';

// `liveScores.ts` pulls server-only deps at import (Sentry + the Supabase service client);
// `selectLiveScores` itself is pure, so stub them so the module loads under jsdom. The Supabase
// double is a `from(table)` dispatcher rather than `{}` because the nav-dot gate (#843) now runs
// the whole live-payload path, which reads `games` and then `seasons`.
let fromImpl: (table: string) => unknown = () => {
  throw new Error('supabaseService.from called with no double installed');
};

vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));
vi.mock('$lib/supabase/service', () => ({
  supabaseService: { from: (table: string) => fromImpl(table) }
}));
vi.mock('../db/queries/findActiveWeek', () => ({ findActiveWeek: vi.fn() }));
// Keep the real `EspnFetchError` / `EspnParseError` classes — `computeLiveScores` narrows on them
// with `instanceof` to tell a non-fatal feed miss from a real bug — and stub only the network call.
vi.mock('../schedule', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../schedule')>()),
  fetchEspnWeek: vi.fn()
}));

import {
  selectLiveScores,
  isActiveWeekLive,
  isActiveWeekLiveCached,
  __resetActiveWeekLiveCache,
  __resetLiveScoresCache,
  type WeekGameForLive
} from '../liveScores';
import { findActiveWeek } from '../db/queries/findActiveWeek';
import { fetchEspnWeek, EspnFetchError, type EspnGame } from '../schedule';
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
    __resetLiveScoresCache();
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

describe('isActiveWeekLive — the Week tab pulse means a game is on RIGHT NOW (#843)', () => {
  // Regression cover for the dot that stayed lit until ~8am Friday after a Thursday-night game.
  // The 12h `LIVE_WINDOW_MS` is sized by the grade cron, not by game length, so "inside the
  // window" was never the same question as "a game is being played". These cases pin the dot to
  // the feed's own `in_progress` verdict, and assert the window keeps its separate job: deciding
  // whether we may ask ESPN at all.
  const WEEK = { id: 42, season_id: 7, week_number: 3 };

  /** Install a Supabase double for one active week's games (`seasons` answers the year). */
  function installWeek(
    games: Array<{ id: string; scheduleGameId: string | null; kickoffMs: number }>
  ) {
    vi.mocked(findActiveWeek).mockResolvedValue(WEEK as never);
    fromImpl = (table: string) => {
      if (table === 'games') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: games.map((g) => ({
                  id: g.id,
                  schedule_game_id: g.scheduleGameId,
                  commence_time: new Date(g.kickoffMs).toISOString()
                })),
                error: null
              })
          })
        };
      }
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { year: 2026 }, error: null })
            })
          })
        };
      }
      throw new Error(`unexpected table: ${table}`);
    };
  }

  beforeEach(() => {
    __resetActiveWeekLiveCache();
    __resetLiveScoresCache();
    vi.mocked(findActiveWeek).mockReset();
    vi.mocked(fetchEspnWeek).mockReset();
    fromImpl = () => {
      throw new Error('supabaseService.from called with no double installed');
    };
  });

  it('is lit while the feed reports a game in progress', async () => {
    installWeek([{ id: 'g1', scheduleGameId: 'e1', kickoffMs: NOW - 60 * 60 * 1000 }]);
    vi.mocked(fetchEspnWeek).mockResolvedValue({
      games: [espn({ scheduleGameId: 'e1', status: 'in_progress' })]
    } as never);

    expect(await isActiveWeekLive(NOW)).toBe(true);
  });

  it('goes dark once the night is over, deep inside the 12h board window (#843)', async () => {
    // The Thursday-night shape: kicked off 10h ago, so still inside LIVE_WINDOW_MS. The old
    // kickoff-only check answered true here — precisely the Friday-morning false alarm.
    const kickoffMs = NOW - 10 * 60 * 60 * 1000;
    expect(kickoffMs + LIVE_WINDOW_MS).toBeGreaterThan(NOW); // still in the board's window
    installWeek([{ id: 'g1', scheduleGameId: 'e1', kickoffMs }]);
    vi.mocked(fetchEspnWeek).mockResolvedValue({
      games: [espn({ scheduleGameId: 'e1', status: 'final', displayClock: null, period: null })]
    } as never);

    expect(await isActiveWeekLive(NOW)).toBe(false);
  });

  it('stays lit through a mixed slate — one final, one still playing', async () => {
    installWeek([
      { id: 'g1', scheduleGameId: 'e1', kickoffMs: NOW - 4 * 60 * 60 * 1000 },
      { id: 'g2', scheduleGameId: 'e2', kickoffMs: NOW - 30 * 60 * 1000 }
    ]);
    vi.mocked(fetchEspnWeek).mockResolvedValue({
      games: [
        espn({ scheduleGameId: 'e1', status: 'final', displayClock: null, period: null }),
        espn({ scheduleGameId: 'e2', status: 'in_progress' })
      ]
    } as never);

    expect(await isActiveWeekLive(NOW)).toBe(true);
  });

  it('is dark before kickoff, and never asks ESPN (the board self-gate is untouched)', async () => {
    installWeek([{ id: 'g1', scheduleGameId: 'e1', kickoffMs: NOW + 60 * 60 * 1000 }]);

    expect(await isActiveWeekLive(NOW)).toBe(false);
    expect(fetchEspnWeek).not.toHaveBeenCalled();
  });

  it('is dark once the week has aged out of the window, with no ESPN call', async () => {
    installWeek([{ id: 'g1', scheduleGameId: 'e1', kickoffMs: NOW - (LIVE_WINDOW_MS + 60_000) }]);

    expect(await isActiveWeekLive(NOW)).toBe(false);
    expect(fetchEspnWeek).not.toHaveBeenCalled();
  });

  it('fails dark when ESPN is unreachable — a missed cue beats a false one', async () => {
    installWeek([{ id: 'g1', scheduleGameId: 'e1', kickoffMs: NOW - 60 * 60 * 1000 }]);
    vi.mocked(fetchEspnWeek).mockRejectedValue(new EspnFetchError('espn down'));

    expect(await isActiveWeekLive(NOW)).toBe(false);
  });

  it('is dark in the offseason — no active week, so nothing past findActiveWeek runs', async () => {
    vi.mocked(findActiveWeek).mockResolvedValue(null as never);

    expect(await isActiveWeekLive(NOW)).toBe(false);
    expect(fetchEspnWeek).not.toHaveBeenCalled();
  });
});
