import { describe, it, expect } from 'vitest';
import {
  players,
  currentUserId,
  orderedPlayers,
  weeks,
  activeWeekNumber,
  weekTotals,
  tableByWeek,
  seasonYearStore,
  seasonTotalsStore
} from '../leaderboard';

// Helper to read a store once
function getValue<T>(store: { subscribe: (fn: (v: T) => void) => () => void }): T {
  let val!: T;
  const unsub = store.subscribe((v) => (val = v));
  unsub();
  return val;
}

function resetStores() {
  players.set([]);
  currentUserId.set(null);
  weeks.set([]);
  activeWeekNumber.set(null);
  weekTotals.set({});
  tableByWeek.set({});
  seasonYearStore.set(null);
  seasonTotalsStore.set([]);
}

describe('leaderboard stores', () => {
  it('orders players with current user first', () => {
    resetStores();
    const base = [
      { id: 'u1', display_name: 'Alice' },
      { id: 'u2', display_name: 'Bob' },
      { id: 'u3', display_name: 'Cara' }
    ];
    players.set(base);
    currentUserId.set('u2');
    const ordered = getValue(orderedPlayers);
    expect(ordered.map((p) => p.id)).toEqual(['u2', 'u1', 'u3']);
  });

  it('falls back to original order when no current user', () => {
    resetStores();
    const base = [
      { id: 'u1', display_name: 'Alice' },
      { id: 'u2', display_name: 'Bob' }
    ];
    players.set(base);
    const ordered = getValue(orderedPlayers);
    expect(ordered.map((p) => p.id)).toEqual(['u1', 'u2']);
  });

  it('reacts to currentUserId changes', () => {
    resetStores();
    players.set([
      { id: 'x', display_name: 'X' },
      { id: 'y', display_name: 'Y' },
      { id: 'z', display_name: 'Z' }
    ]);
    currentUserId.set('z');
    expect(getValue(orderedPlayers).map((p) => p.id)).toEqual(['z', 'x', 'y']);
    currentUserId.set('x');
    expect(getValue(orderedPlayers).map((p) => p.id)).toEqual(['x', 'y', 'z']);
    currentUserId.set(null);
    expect(getValue(orderedPlayers).map((p) => p.id)).toEqual(['x', 'y', 'z']);
  });

  it('does not mutate original players array when ordering', () => {
    resetStores();
    const base = [
      { id: 'a', display_name: 'A' },
      { id: 'b', display_name: 'B' }
    ];
    players.set(base);
    currentUserId.set('b');
    getValue(orderedPlayers); // trigger derive
    expect(getValue(players)).toEqual(base); // unchanged
  });

  it('stores and retrieves week / season metadata', () => {
    resetStores();
    weeks.set([3, 4, 1, 2]);
    activeWeekNumber.set(3);
    seasonYearStore.set(2025);
    seasonTotalsStore.set([
      {
        user_id: 'p1',
        display_name: 'A',
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
    expect(getValue(weeks)).toEqual([3, 4, 1, 2]);
    expect(getValue(activeWeekNumber)).toBe(3);
    expect(getValue(seasonYearStore)).toBe(2025);
    expect(getValue(seasonTotalsStore)).toHaveLength(1);
  });

  it('stores weekTotals and tableByWeek shapes', () => {
    resetStores();
    weekTotals.set({
      3: { p1: 5, p2: -1 }
    });
    tableByWeek.set({
      3: {
        games: [{ game_id: '10', label: 'AWY @ HOM', score: null, isFinal: false }],
        cells: { '10': { p1: { weight: null, team: null, result: 'W', spread: null } } }
      }
    });
    expect(getValue(weekTotals)).toEqual({ 3: { p1: 5, p2: -1 } });
    expect(getValue(tableByWeek)['3'].games[0].game_id).toBe('10');
  });

  it('orderedPlayers handles empty players gracefully', () => {
    resetStores();
    currentUserId.set('any');
    expect(getValue(orderedPlayers)).toEqual([]);
  });
});
