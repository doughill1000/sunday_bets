import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import WeekHeader from '../WeekHeader.svelte';

const players = [
  { id: 'p1', display_name: 'Alice Alpha' },
  { id: 'p2', display_name: 'Bob Beta' },
  { id: 'p3', display_name: 'Cara Gamma' }
];

describe('WeekHeader', () => {
  it('renders week number', () => {
    const { getByText } = render(WeekHeader, {
      weekNumber: 3,
      players,
      totals: {},
      activeWeekNumber: null
    });
    expect(getByText('Week 3')).toBeTruthy();
  });

  it('marks active week and shows ACTIVE badge', () => {
    const { getByText } = render(WeekHeader, {
      weekNumber: 5,
      players,
      totals: {},
      activeWeekNumber: 5
    });
    const badge = getByText('ACTIVE');
    expect(badge).toBeTruthy();
    const weekSpan = getByText('Week 5').parentElement;
    expect(weekSpan?.getAttribute('aria-current')).toBe('true');
    // class checks (tailwind utilities present)
    expect(weekSpan?.className).toMatch(/ring-2/);
    expect(weekSpan?.className).toMatch(/ring-blue-500/);
  });

  it('highlights top scorer with trophy and outline when positive', () => {
    const { getByText } = render(WeekHeader, {
      weekNumber: 2,
      players,
      totals: { p1: 4, p2: -1, p3: 0 },
      activeWeekNumber: null
    });
    // Trophy near Alice
    const trophy = getByText('🏆');
    expect(trophy).toBeTruthy();
    // Alice total should have +4 and green
    const plusFour = getByText('+4');
    expect(plusFour.className).toMatch(/text-green-600/);
  });

  it('does not show trophy if all totals are zero', () => {
    const { queryByText } = render(WeekHeader, {
      weekNumber: 1,
      players,
      totals: { p1: 0, p2: 0, p3: 0 },
      activeWeekNumber: null
    });
    expect(queryByText('🏆')).toBeNull();
  });

  it('shows multiple trophies on tie with non-zero totals', () => {
    const { getAllByText } = render(WeekHeader, {
      weekNumber: 7,
      players,
      totals: { p1: 3, p2: 3, p3: 1 },
      activeWeekNumber: null
    });
    const trophies = getAllByText('🏆');
    expect(trophies.length).toBe(2);
  });

  it('formats negative totals red and without plus sign', () => {
    const { getByText } = render(WeekHeader, {
      weekNumber: 4,
      players,
      totals: { p1: -2, p2: 0, p3: 5 },
      activeWeekNumber: null
    });
    const neg = getByText('-2');
    expect(neg.className).toMatch(/text-red-600/);
    // Positive has plus sign
    const pos = getByText('+5');
    expect(pos.className).toMatch(/text-green-600/);
  });

  it('shows zero in neutral styling', () => {
    const { container } = render(WeekHeader, {
      weekNumber: 8,
      players,
      totals: { p1: 0, p2: 1, p3: -1 },
      activeWeekNumber: null
    });
    const zeroEl = container.querySelector('[data-player-id="p1"] [data-total-val]');
    expect(zeroEl).toBeTruthy();
    expect(zeroEl?.textContent).toBe('0');
    expect(zeroEl?.className).toMatch(/text-neutral-600/);
  });
});