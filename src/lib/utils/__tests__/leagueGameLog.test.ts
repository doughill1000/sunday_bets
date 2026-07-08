import { describe, it, expect } from 'vitest';
import { formatLine, formatCoverMargin } from '$lib/utils/leagueGameLog';

describe('formatLine', () => {
  it('shows a favored (negative) line with a minus and an underdog line with a plus', () => {
    expect(formatLine(-3.5)).toBe('-3.5');
    expect(formatLine(6)).toBe('+6');
  });

  it('renders a pick’em (0) as PK, not +0', () => {
    expect(formatLine(0)).toBe('PK');
  });
});

describe('formatCoverMargin', () => {
  it('signs a cover (positive) and a non-cover (negative) margin', () => {
    expect(formatCoverMargin(7)).toBe('+7');
    expect(formatCoverMargin(-3.5)).toBe('-3.5');
  });

  it('renders a 0 margin as Push, not +0 (it is a no-decision)', () => {
    expect(formatCoverMargin(0)).toBe('Push');
  });
});
