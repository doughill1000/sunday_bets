// tests/components/PicksBoard.test.ts
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import PicksBoard from '../PicksBoard.svelte';
import { picks } from '../../../stores/picks';
import { get } from 'svelte/store';

const FUTURE = new Date(Date.now() + 24 * 3600_000).toISOString();

const games = [
  // home favorite
  {
    id: 'g1',
    home: 'CIN',
    away: 'JAX',
    kickoff: FUTURE,
    homeTeamId: 1,
    awayTeamId: 2,
    spreadTeamId: 1,
    spreadValue: -3
  },
  // away favorite
  {
    id: 'g2',
    home: 'GB',
    away: 'WAS',
    kickoff: FUTURE,
    homeTeamId: 3,
    awayTeamId: 4,
    spreadTeamId: 4,
    spreadValue: -2.5
  },
  // no line
  {
    id: 'g3',
    home: 'NE',
    away: 'NYJ',
    kickoff: FUTURE,
    homeTeamId: 5,
    awayTeamId: 6,
    spreadTeamId: null,
    spreadValue: null
  }
] as any;

describe('PicksBoard', () => {
  it('seeds the spread favorite (no weight) for un-picked games and preserves existing picks', () => {
    render(PicksBoard, {
      props: { games, initialPicks: { g1: { selected: { team: 'away' } } as any } }
    });
    const s = get(picks);

    // Existing staged pick is preserved untouched.
    expect(s.g1.selected?.team).toBe('away');

    // Un-picked game stages its favorite (away here) with NO weight — nothing auto-saves.
    expect(s.g2.selected).toEqual({ team: 'away' });
    expect(s.g2.selected?.weight).toBeUndefined();

    // No-line game stages no team at all.
    expect(s.g3.selected).toBeUndefined();

    // Nothing is locked on load.
    expect(s.g1.lockedPick).toBeUndefined();
    expect(s.g2.lockedPick).toBeUndefined();
  });
});
