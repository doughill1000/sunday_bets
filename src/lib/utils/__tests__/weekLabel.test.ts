import { describe, it, expect } from 'vitest';
import { weekLabel } from '../weekLabel';
import type { SeasonWeekOption } from '$lib/types/leaderboard';

function week(weekNumber: number): SeasonWeekOption {
  return { weekId: 1, weekNumber, isScoring: true };
}

describe('weekLabel', () => {
  it('labels a regular-season week', () => {
    expect(weekLabel(week(12))).toBe('Week 12');
  });

  it('labels a negative week_number as a preseason round (ADR-0016)', () => {
    expect(weekLabel(week(-1))).toBe('Preseason 1');
    expect(weekLabel(week(-3))).toBe('Preseason 3');
  });

  it('falls back when no week is selected', () => {
    expect(weekLabel(null)).toBe('No weeks started');
  });
});
