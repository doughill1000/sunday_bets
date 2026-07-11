import { describe, it, expect } from 'vitest';
import { topMarketBends, BENDS_LIMIT, type MarketBendCuts } from '$lib/utils/leagueBends';
import { LEAGUE_THIN_SAMPLE } from '$lib/utils/leagueAts';
import type {
  LeagueQuadrant,
  LeagueSpreadBucket,
  LeaguePrimetimeSlot,
  LeagueDivisionalSplit
} from '$lib/types/server/league';

// ── Fixture builders ────────────────────────────────────────────────────────────
function bucket(
  bucketOrder: number,
  key: string,
  favoriteCovers: number,
  underdogCovers: number,
  games = favoriteCovers + underdogCovers
): LeagueSpreadBucket {
  return { bucketOrder, bucket: key, favoriteCovers, underdogCovers, pushes: 0, games };
}

function quadrant(
  isHome: boolean,
  isFavorite: boolean,
  wins: number,
  losses: number,
  games = wins + losses
): LeagueQuadrant {
  return { isHome, isFavorite, games, ats: { wins, losses, pushes: 0 } };
}

function slot(
  s: LeaguePrimetimeSlot['slot'],
  favoriteCovers: number,
  underdogCovers: number,
  games = favoriteCovers + underdogCovers
): LeaguePrimetimeSlot {
  return { slot: s, favoriteCovers, underdogCovers, pushes: 0, games };
}

function divisional(
  isDivisional: boolean,
  favoriteCovers: number,
  underdogCovers: number,
  games = favoriteCovers + underdogCovers
): LeagueDivisionalSplit {
  return { isDivisional, favoriteCovers, underdogCovers, pushes: 0, games };
}

const EMPTY: MarketBendCuts = {
  spreadBuckets: [],
  quadrants: [],
  primetime: [],
  divisional: []
};

describe('topMarketBends', () => {
  it('ranks cuts by absolute deviation from a 50% coin flip, most-notable first', () => {
    const cuts: MarketBendCuts = {
      spreadBuckets: [
        bucket(0, 'pickem', 0, 0, 40), // no favorite — excluded
        bucket(1, '1-3', 52, 48), // dev +0.02
        bucket(4, '10+', 46, 54) // dev −0.04 (biggest)
      ],
      quadrants: [
        quadrant(true, true, 49, 51), // home fav, dev −0.01
        quadrant(false, true, 53, 47), // road fav, dev +0.03
        quadrant(true, false, 55, 45), // underdog quadrant — excluded (mirror)
        quadrant(false, false, 45, 55)
      ],
      primetime: [slot('SNF', 48, 52), slot('MNF', 48, 52), slot('day', 50, 50)],
      divisional: [divisional(true, 51, 49), divisional(false, 50, 50)]
    };

    const bends = topMarketBends(cuts);
    // Ordered by |deviation|: 10+ (.04) > road fav (.03) > primetime (.02) = small (.02) > …
    expect(bends.map((b) => b.key)).toEqual([
      'spread-10+',
      'quadrant-road-fav',
      'primetime-night',
      'spread-1-3',
      'divisional',
      'quadrant-home-fav'
    ]);
  });

  it('classifies the side and sign of each deviation', () => {
    const cuts: MarketBendCuts = {
      ...EMPTY,
      quadrants: [quadrant(false, true, 53, 47), quadrant(true, true, 47, 53)]
    };
    const bends = topMarketBends(cuts);
    const road = bends.find((b) => b.key === 'quadrant-road-fav')!;
    const home = bends.find((b) => b.key === 'quadrant-home-fav')!;

    expect(road.side).toBe('fav');
    expect(road.deviation).toBeCloseTo(0.03);
    expect(road.coverPct).toBeCloseTo(0.53);
    expect(home.side).toBe('dog');
    expect(home.deviation).toBeCloseTo(-0.03);
  });

  it('excludes the pick’em bucket and the underdog quadrants (redundant mirror)', () => {
    const cuts: MarketBendCuts = {
      ...EMPTY,
      spreadBuckets: [bucket(0, 'pickem', 0, 0, 30)],
      quadrants: [quadrant(true, false, 60, 40), quadrant(false, false, 40, 60)]
    };
    expect(topMarketBends(cuts)).toEqual([]);
  });

  it('pools the night slots into one primetime cut, ignoring daytime', () => {
    const cuts: MarketBendCuts = {
      ...EMPTY,
      primetime: [slot('TNF', 6, 4), slot('SNF', 6, 4), slot('MNF', 6, 4), slot('day', 100, 100)]
    };
    const [pt] = topMarketBends(cuts);
    expect(pt.key).toBe('primetime-night');
    expect(pt.games).toBe(30); // 3 night slots × 10, daytime not counted
    expect(pt.coverPct).toBeCloseTo(0.6); // 18 / 30
  });

  it('drops cuts below the sample floor (too noisy to rank), keeping the rest', () => {
    const cuts: MarketBendCuts = {
      ...EMPTY,
      quadrants: [
        quadrant(false, true, 6, 3, LEAGUE_THIN_SAMPLE - 1), // 9 games — below floor
        quadrant(true, true, 40, 60, 100) // 100 games — kept
      ]
    };
    const bends = topMarketBends(cuts);
    expect(bends.map((b) => b.key)).toEqual(['quadrant-home-fav']);
  });

  it('drops a cut with no decided games (all pushes) rather than plotting a 0%', () => {
    const cuts: MarketBendCuts = {
      ...EMPTY,
      divisional: [
        { isDivisional: true, favoriteCovers: 0, underdogCovers: 0, pushes: 12, games: 12 }
      ]
    };
    expect(topMarketBends(cuts)).toEqual([]);
  });

  it('caps the result at the requested limit', () => {
    const cuts: MarketBendCuts = {
      ...EMPTY,
      spreadBuckets: [
        bucket(1, '1-3', 52, 48),
        bucket(2, '3.5-6.5', 53, 47),
        bucket(3, '7-9.5', 47, 53),
        bucket(4, '10+', 46, 54)
      ],
      quadrants: [quadrant(true, true, 49, 51), quadrant(false, true, 54, 46)]
    };
    expect(topMarketBends(cuts, { limit: 3 })).toHaveLength(3);
    expect(topMarketBends(cuts)).toHaveLength(BENDS_LIMIT); // 6 candidates ≤ default limit
  });

  it('returns an empty list for an empty (pre-season) payload', () => {
    expect(topMarketBends(EMPTY)).toEqual([]);
  });

  it('labels the spread buckets by line size', () => {
    const cuts: MarketBendCuts = {
      ...EMPTY,
      spreadBuckets: [bucket(3, '7-9.5', 40, 60)]
    };
    expect(topMarketBends(cuts)[0].label).toBe('Big favs (7–9.5)');
  });
});
