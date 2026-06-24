import { describe, it, expect } from 'vitest';
import { currentUserId, seasonYearStore, seasonTotalsStore } from '../leaderboard';

function getValue<T>(store: { subscribe: (fn: (v: T) => void) => () => void }): T {
  let val!: T;
  const unsub = store.subscribe((v) => (val = v));
  unsub();
  return val;
}

function resetStores() {
  currentUserId.set(null);
  seasonYearStore.set(null);
  seasonTotalsStore.set([]);
}

describe('leaderboard stores', () => {
  it('stores and retrieves season metadata', () => {
    resetStores();
    seasonYearStore.set(2025);
    seasonTotalsStore.set([
      {
        user_id: 'p1',
        display_name: 'A',
        avatar_key: null,
        season_year: 2025,
        total_points: 5,
        decisions: 1,
        wins: 1,
        losses: 0,
        pushes: 0,
        missed: 0,
        rank: 1
      }
    ]);
    expect(getValue(seasonYearStore)).toBe(2025);
    expect(getValue(seasonTotalsStore)).toHaveLength(1);
  });

  it('stores and retrieves currentUserId', () => {
    resetStores();
    currentUserId.set('u1');
    expect(getValue(currentUserId)).toBe('u1');
    currentUserId.set(null);
    expect(getValue(currentUserId)).toBeNull();
  });

  it('defaults to empty state', () => {
    resetStores();
    expect(getValue(currentUserId)).toBeNull();
    expect(getValue(seasonYearStore)).toBeNull();
    expect(getValue(seasonTotalsStore)).toEqual([]);
  });
});
