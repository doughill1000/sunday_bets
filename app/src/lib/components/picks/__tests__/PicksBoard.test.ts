// tests/components/PicksBoard.test.ts
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import PicksBoard from '../PicksBoard.svelte';
import { picks } from '../../../stores/picks';
import { get } from 'svelte/store';

const games = [
  { id: 'g1', home: 'CIN', away: 'JAX' },
  { id: 'g2', home: 'GB', away: 'WAS' }
] as any;

describe('PicksBoard', () => {
  it('initializes store and defaults missing selections to home', async () => {
    render(PicksBoard, {
      props: { games, initialPicks: { g1: { selected: { team: 'away', weight: 'L' } } as any } }
    });
    const s = get(picks);
    expect(s.g1.selected?.team).toBe('away'); // preserved
    expect(s.g2.selected?.team).toBe('home'); // defaulted
  });
});
