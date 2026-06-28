import { describe, it, expect, vi } from 'vitest';

// deriveLeagueHonors is pure, but it lives alongside the DB readers in honors.ts which
// import the service client. Neutralize that import so the unit test never touches $env.
vi.mock('$lib/supabase/service', () => ({ supabaseService: {} }));

import { deriveLeagueHonors } from '../honors';
import type { SeasonHonor } from '$lib/types/honors';

function honor(overrides: Partial<SeasonHonor> = {}): SeasonHonor {
  return {
    season_year: 2024,
    user_id: 'u1',
    display_name: 'Player One',
    avatar_key: null,
    rank: 1,
    total_points: 0,
    ...overrides
  };
}

describe('deriveLeagueHonors', () => {
  it('returns empty honors when there are no completed standings', () => {
    expect(deriveLeagueHonors([])).toEqual({
      reigningChampion: null,
      trophyCase: [],
      woodenSpoon: null
    });
  });

  it('picks champion, trophy case (newest first) and wooden spoon across seasons', () => {
    // Input order matches the queries: season_year DESC, then rank ASC.
    const rows: SeasonHonor[] = [
      honor({ season_year: 2024, user_id: 'alice', rank: 1, total_points: 30 }),
      honor({ season_year: 2024, user_id: 'bob', rank: 2, total_points: 20 }),
      honor({ season_year: 2024, user_id: 'carol', rank: 3, total_points: 10 }),
      honor({ season_year: 2023, user_id: 'bob', rank: 1, total_points: 25 }),
      honor({ season_year: 2023, user_id: 'alice', rank: 2, total_points: 15 })
    ];

    const { reigningChampion, trophyCase, woodenSpoon } = deriveLeagueHonors(rows);

    // Reigning champion = rank 1 of the newest completed season.
    expect(reigningChampion).toMatchObject({ season_year: 2024, user_id: 'alice', rank: 1 });

    // Trophy case = every season's rank-1, newest first.
    expect(trophyCase.map((c) => [c.season_year, c.user_id])).toEqual([
      [2024, 'alice'],
      [2023, 'bob']
    ]);

    // Wooden spoon = max rank of the newest completed season.
    expect(woodenSpoon).toMatchObject({ season_year: 2024, user_id: 'carol', rank: 3 });
  });

  it('returns the same player as champion and wooden spoon for a one-player season', () => {
    const rows: SeasonHonor[] = [honor({ season_year: 2024, user_id: 'solo', rank: 1 })];

    const { reigningChampion, woodenSpoon } = deriveLeagueHonors(rows);

    expect(reigningChampion?.user_id).toBe('solo');
    // Component-level suppression relies on this equality.
    expect(woodenSpoon?.user_id).toBe('solo');
  });
});
