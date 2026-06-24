import { describe, it, expect } from 'vitest';
import { canUseAllInRule } from '../rules';
import type { PickEntry } from '$lib/types/picks';

function picks(overrides: Record<string, Partial<PickEntry>> = {}): Record<string, PickEntry> {
  return overrides as Record<string, PickEntry>;
}

describe('canUseAllInRule', () => {
  it('allows All-In when no other game uses it', () => {
    expect(canUseAllInRule('g1', picks({ g1: { selected: { team: 'home', weight: 'M' } } }))).toBe(true);
  });

  it('blocks All-In when another game has selected All-In', () => {
    const all = picks({
      g1: { selected: { team: 'home', weight: 'M' } },
      g2: { selected: { team: 'home', weight: 'A' } }
    });
    expect(canUseAllInRule('g1', all)).toBe(false);
  });

  it('blocks All-In when another game has a locked All-In pick', () => {
    const all = picks({
      g1: { selected: { team: 'home', weight: 'M' } },
      g2: { lockedPick: { team: 'away', weight: 'A' } }
    });
    expect(canUseAllInRule('g1', all)).toBe(false);
  });

  it('does not count the same game against itself', () => {
    const all = picks({
      g1: { selected: { team: 'home', weight: 'A' } }
    });
    expect(canUseAllInRule('g1', all)).toBe(true);
  });

  describe('final-week exception', () => {
    const allWithOtherAllin = picks({
      g1: { selected: { team: 'home', weight: 'M' } },
      g2: { selected: { team: 'home', weight: 'A' } }
    });

    it('allows All-In on the final week when exception is enabled', () => {
      expect(canUseAllInRule('g1', allWithOtherAllin, true, true)).toBe(true);
    });

    it('blocks All-In on the final week when exception is disabled', () => {
      expect(canUseAllInRule('g1', allWithOtherAllin, true, false)).toBe(false);
    });

    it('blocks All-In on a non-final week even when exception is enabled', () => {
      expect(canUseAllInRule('g1', allWithOtherAllin, false, true)).toBe(false);
    });

    it('blocks All-In on a non-final week when exception is disabled', () => {
      expect(canUseAllInRule('g1', allWithOtherAllin, false, false)).toBe(false);
    });
  });
});
