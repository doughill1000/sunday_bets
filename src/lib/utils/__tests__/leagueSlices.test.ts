import { describe, it, expect } from 'vitest';
import {
  availableSituationalSlices,
  availableLeagueSlices,
  resolveLeagueSlice,
  LEAGUE_SLICE_ORDER,
  type LeagueSlice,
  type SituationalSliceCuts
} from '$lib/utils/leagueSlices';
import type {
  LeagueSpreadBucket,
  LeagueQuadrant,
  LeaguePrimetimeSlot,
  LeagueDivisionalSplit
} from '$lib/types/server/league';

// ── Fixture builders ────────────────────────────────────────────────────────────
function bucket(bucketOrder: number, key: string, games: number): LeagueSpreadBucket {
  return { bucketOrder, bucket: key, favoriteCovers: 0, underdogCovers: 0, pushes: 0, games };
}
function quadrant(isHome: boolean, isFavorite: boolean, games: number): LeagueQuadrant {
  return { isHome, isFavorite, games, ats: { wins: 0, losses: 0, pushes: 0 } };
}
function slot(s: LeaguePrimetimeSlot['slot'], games: number): LeaguePrimetimeSlot {
  return { slot: s, favoriteCovers: 0, underdogCovers: 0, pushes: 0, games };
}
function divisional(isDivisional: boolean, games: number): LeagueDivisionalSplit {
  return { isDivisional, favoriteCovers: 0, underdogCovers: 0, pushes: 0, games };
}

const EMPTY: SituationalSliceCuts = {
  favDog: { games: 0 },
  spreadBuckets: [],
  quadrants: [],
  primetime: [],
  divisional: []
};

describe('availableSituationalSlices', () => {
  it('offers no situational slice for an empty (pre-season) payload', () => {
    expect(availableSituationalSlices(EMPTY)).toEqual([]);
  });

  it('offers every cut that has data, in canonical reading order', () => {
    const cuts: SituationalSliceCuts = {
      favDog: { games: 200 },
      spreadBuckets: [bucket(1, '1-3', 40)],
      quadrants: [quadrant(true, true, 100)],
      primetime: [slot('SNF', 16)],
      divisional: [divisional(true, 60)]
    };
    expect(availableSituationalSlices(cuts)).toEqual([
      'favorites',
      'spread',
      'primetime',
      'divisional'
    ]);
  });

  it('withholds Favorites when the fav/dog split has no games', () => {
    const cuts: SituationalSliceCuts = { ...EMPTY, favDog: { games: 0 } };
    expect(availableSituationalSlices(cuts)).not.toContain('favorites');
  });

  it('withholds Divisional when every divisional split is empty', () => {
    const cuts: SituationalSliceCuts = {
      ...EMPTY,
      divisional: [divisional(true, 0), divisional(false, 0)]
    };
    expect(availableSituationalSlices(cuts)).not.toContain('divisional');
  });
});

describe('availableLeagueSlices', () => {
  it('always leads with "By team", even when no situational cut has data', () => {
    expect(availableLeagueSlices(EMPTY)).toEqual(['teams']);
  });

  it('prepends "By team" to the available situational cuts', () => {
    const cuts: SituationalSliceCuts = { ...EMPTY, favDog: { games: 50 } };
    expect(availableLeagueSlices(cuts)).toEqual(['teams', 'favorites']);
  });
});

describe('resolveLeagueSlice', () => {
  const available: LeagueSlice[] = ['teams', 'favorites', 'spread'];

  it('keeps the user selection when it is still available', () => {
    expect(resolveLeagueSlice('spread', available)).toBe('spread');
  });

  it('falls back to the first slice ("By team") when the selection vanished', () => {
    expect(resolveLeagueSlice('primetime', available)).toBe('teams');
  });

  it('falls back to "By team" when nothing is selected yet', () => {
    expect(resolveLeagueSlice(null, available)).toBe('teams');
  });

  it('defaults to "teams" if somehow given an empty availability list', () => {
    expect(resolveLeagueSlice('favorites', [])).toBe('teams');
  });
});

describe('LEAGUE_SLICE_ORDER', () => {
  it('starts with the by-team lens', () => {
    expect(LEAGUE_SLICE_ORDER[0]).toBe('teams');
  });
});
