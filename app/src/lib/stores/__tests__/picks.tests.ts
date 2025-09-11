// tests/stores/picks.test.ts
import { describe, it, expect } from 'vitest';
import { picks, setPicks, selectTeam, setWeight } from '$lib/stores/picks';
import { get } from 'svelte/store';

describe('picks store', () => {
  it('selectTeam sets selected team preserving existing weight', () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'H' } } as any });
    selectTeam('g1', 'away');
    expect(get(picks).g1.selected).toEqual({ team: 'away', weight: 'H' });
  });

  it('setWeight sets weight preserving existing team', () => {
    setPicks({ g2: { selected: { team: 'home', weight: 'L' } } as any });
    setWeight('g2', 'A');
    expect(get(picks).g2.selected).toEqual({ team: 'home', weight: 'A' });
  });
});
