import { describe, expect, test } from 'vitest';
import {
  deriveFavDogHeadline,
  poolDivisional,
  poolHomeAway,
  poolPrimetime,
  poolQuadrants,
  poolSpreadBuckets
} from '../leagueTrends';
import type {
  LeagueDivisionalSplit,
  LeagueHomeAway,
  LeaguePrimetimeSlot,
  LeagueQuadrant,
  LeagueSpreadBucket
} from '$lib/types/server/league';

// Two-season fixtures: pooling must sum the already-computed integer counts key-by-key.

describe('poolSpreadBuckets', () => {
  test('sums bucket counts across seasons and keeps pick’em-first order', () => {
    const rows: LeagueSpreadBucket[] = [
      // out of order on purpose to prove the sort
      { bucketOrder: 1, bucket: '1-3', games: 10, favoriteCovers: 6, underdogCovers: 4, pushes: 0 },
      {
        bucketOrder: 0,
        bucket: 'pickem',
        games: 2,
        favoriteCovers: 0,
        underdogCovers: 0,
        pushes: 0
      },
      { bucketOrder: 1, bucket: '1-3', games: 8, favoriteCovers: 3, underdogCovers: 4, pushes: 1 }
    ];
    const pooled = poolSpreadBuckets(rows);
    expect(pooled.map((b) => b.bucketOrder)).toEqual([0, 1]);
    const oneToThree = pooled.find((b) => b.bucketOrder === 1)!;
    expect(oneToThree).toMatchObject({
      bucket: '1-3',
      games: 18,
      favoriteCovers: 9,
      underdogCovers: 8,
      pushes: 1
    });
  });

  test('does not mutate the input rows', () => {
    const rows: LeagueSpreadBucket[] = [
      {
        bucketOrder: 2,
        bucket: '3.5-6.5',
        games: 5,
        favoriteCovers: 3,
        underdogCovers: 2,
        pushes: 0
      },
      {
        bucketOrder: 2,
        bucket: '3.5-6.5',
        games: 5,
        favoriteCovers: 1,
        underdogCovers: 4,
        pushes: 0
      }
    ];
    poolSpreadBuckets(rows);
    expect(rows[0].games).toBe(5);
    expect(rows[0].favoriteCovers).toBe(3);
  });
});

describe('poolQuadrants', () => {
  const q = (
    isHome: boolean,
    isFavorite: boolean,
    w: number,
    l: number,
    p: number
  ): LeagueQuadrant => ({
    isHome,
    isFavorite,
    games: w + l + p,
    ats: { wins: w, losses: l, pushes: p }
  });

  test('sums each of the four quadrants independently', () => {
    const rows = [
      q(true, true, 5, 3, 0), // home fav, season A
      q(true, true, 4, 4, 1), // home fav, season B
      q(false, false, 2, 6, 0) // road dog, season A
    ];
    const pooled = poolQuadrants(rows);
    const homeFav = pooled.find((c) => c.isHome && c.isFavorite)!;
    expect(homeFav.ats).toEqual({ wins: 9, losses: 7, pushes: 1 });
    expect(homeFav.games).toBe(17);
    const roadDog = pooled.find((c) => !c.isHome && !c.isFavorite)!;
    expect(roadDog.ats).toEqual({ wins: 2, losses: 6, pushes: 0 });
  });
});

describe('poolPrimetime', () => {
  test('sums by slot and returns canonical TNF→SNF→MNF→day order', () => {
    const rows: LeaguePrimetimeSlot[] = [
      { slot: 'day', games: 30, favoriteCovers: 16, underdogCovers: 13, pushes: 1 },
      { slot: 'SNF', games: 4, favoriteCovers: 2, underdogCovers: 2, pushes: 0 },
      { slot: 'day', games: 28, favoriteCovers: 14, underdogCovers: 14, pushes: 0 },
      { slot: 'TNF', games: 3, favoriteCovers: 1, underdogCovers: 2, pushes: 0 }
    ];
    const pooled = poolPrimetime(rows);
    expect(pooled.map((s) => s.slot)).toEqual(['TNF', 'SNF', 'day']);
    expect(pooled.find((s) => s.slot === 'day')).toMatchObject({
      games: 58,
      favoriteCovers: 30,
      underdogCovers: 27,
      pushes: 1
    });
  });
});

describe('poolDivisional', () => {
  test('sums divisional and non-divisional buckets', () => {
    const rows: LeagueDivisionalSplit[] = [
      { isDivisional: true, games: 6, favoriteCovers: 3, underdogCovers: 3, pushes: 0 },
      { isDivisional: true, games: 6, favoriteCovers: 4, underdogCovers: 1, pushes: 1 },
      { isDivisional: false, games: 10, favoriteCovers: 6, underdogCovers: 4, pushes: 0 }
    ];
    const pooled = poolDivisional(rows);
    expect(pooled.find((d) => d.isDivisional)).toMatchObject({
      games: 12,
      favoriteCovers: 7,
      underdogCovers: 4,
      pushes: 1
    });
    expect(pooled.find((d) => !d.isDivisional)?.games).toBe(10);
  });
});

describe('poolHomeAway', () => {
  const season = (hw: number, aw: number): LeagueHomeAway => ({
    home: {
      games: 10,
      ats: { wins: hw, losses: 10 - hw, pushes: 0 },
      su: { wins: hw, losses: 10 - hw, pushes: 0 }
    },
    away: {
      games: 10,
      ats: { wins: aw, losses: 10 - aw, pushes: 0 },
      su: { wins: aw, losses: 10 - aw, pushes: 0 }
    }
  });

  test('returns null for no seasons', () => {
    expect(poolHomeAway([])).toBeNull();
  });

  test('sums home and away games + records across seasons', () => {
    const pooled = poolHomeAway([season(6, 4), season(5, 5)])!;
    expect(pooled.home.games).toBe(20);
    expect(pooled.home.ats).toEqual({ wins: 11, losses: 9, pushes: 0 });
    expect(pooled.away.games).toBe(20);
    expect(pooled.away.ats).toEqual({ wins: 9, losses: 11, pushes: 0 });
  });
});

describe('deriveFavDogHeadline', () => {
  test('sums the two favorite quadrants: covers = fav wins, dog covers = fav losses', () => {
    const quadrants: LeagueQuadrant[] = [
      { isHome: true, isFavorite: true, games: 20, ats: { wins: 11, losses: 8, pushes: 1 } },
      { isHome: false, isFavorite: true, games: 15, ats: { wins: 7, losses: 7, pushes: 1 } },
      // underdog quadrants must be ignored by the derivation
      { isHome: true, isFavorite: false, games: 15, ats: { wins: 7, losses: 7, pushes: 1 } },
      { isHome: false, isFavorite: false, games: 20, ats: { wins: 8, losses: 11, pushes: 1 } }
    ];
    const headline = deriveFavDogHeadline(quadrants);
    expect(headline).toEqual({
      weekNumber: null,
      favoriteCovers: 18, // 11 + 7
      underdogCovers: 15, // 8 + 7
      pushes: 2, // 1 + 1
      games: 35 // 18 + 15 + 2
    });
  });

  test('is zeroed when there are no quadrants', () => {
    expect(deriveFavDogHeadline([])).toEqual({
      weekNumber: null,
      favoriteCovers: 0,
      underdogCovers: 0,
      pushes: 0,
      games: 0
    });
  });
});
