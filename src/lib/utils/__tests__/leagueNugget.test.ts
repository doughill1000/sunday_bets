import { describe, it, expect } from 'vitest';
import {
  MIN_NUGGET_SAMPLE,
  buildSituationalLookup,
  nuggetForSide,
  situationalKey
} from '../leagueNugget';
import type { PickGame } from '$lib/types/games';

// Team 1 hosts Team 2, Team 1 favored by 7 → Team 1 is the home favorite, Team 2 the away dog.
function game(overrides: Partial<PickGame> = {}): PickGame {
  return {
    id: 'g1',
    kickoff: '2026-09-13T18:00:00Z',
    home: 'Home',
    away: 'Away',
    homeTeamId: 1,
    awayTeamId: 2,
    spreadTeamId: 1,
    spreadValue: -7,
    ...overrides
  };
}

const lookup = buildSituationalLookup([
  { teamId: 1, isHome: true, isFavorite: true, games: 8, ats: { wins: 6, losses: 2, pushes: 0 } },
  { teamId: 2, isHome: false, isFavorite: false, games: 5, ats: { wins: 2, losses: 2, pushes: 1 } },
  // Below MIN_NUGGET_SAMPLE (4) — used to prove the thin-sample omission.
  { teamId: 3, isHome: true, isFavorite: true, games: 3, ats: { wins: 2, losses: 1, pushes: 0 } }
]);

describe('situationalKey', () => {
  it('encodes team, home, and favorite', () => {
    expect(situationalKey(7, true, false)).toBe('7:true:false');
  });
});

describe('nuggetForSide', () => {
  it('formats the home-favorite quadrant', () => {
    expect(nuggetForSide(game(), 'home', lookup)).toEqual({
      text: '6-2 ATS as home favorite',
      games: 8
    });
  });

  it('formats the away-underdog quadrant and shows pushes when present', () => {
    expect(nuggetForSide(game(), 'away', lookup)).toEqual({
      text: '2-2-1 ATS as away underdog',
      games: 5
    });
  });

  it('returns null for a pick’em (no favorite quadrant)', () => {
    expect(nuggetForSide(game({ spreadValue: 0 }), 'home', lookup)).toBeNull();
    expect(nuggetForSide(game({ spreadValue: 0 }), 'away', lookup)).toBeNull();
  });

  it('returns null when there is no line', () => {
    expect(
      nuggetForSide(game({ spreadValue: null, spreadTeamId: null }), 'home', lookup)
    ).toBeNull();
  });

  it('returns null below the sample threshold', () => {
    // Team 3 hosts as a favorite but has only 3 quadrant games (< MIN_NUGGET_SAMPLE).
    const g = game({ homeTeamId: 3, spreadTeamId: 3, spreadValue: -3 });
    expect(nuggetForSide(g, 'home', lookup)).toBeNull();
    // …but an explicit lower threshold lets it through.
    expect(nuggetForSide(g, 'home', lookup, 3)).toEqual({
      text: '2-1 ATS as home favorite',
      games: 3
    });
  });

  it('returns null when the quadrant is missing from the lookup', () => {
    expect(nuggetForSide(game({ homeTeamId: 99, spreadTeamId: 99 }), 'home', lookup)).toBeNull();
  });

  it('returns null when the team id is unknown', () => {
    expect(nuggetForSide(game({ homeTeamId: null }), 'home', lookup)).toBeNull();
  });

  it('exports a sane default threshold', () => {
    expect(MIN_NUGGET_SAMPLE).toBeGreaterThan(1);
  });
});
