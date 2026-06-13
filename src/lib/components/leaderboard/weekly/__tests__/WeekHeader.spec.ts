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

  it('marks active week', () => {
    const { getByText, getByLabelText, container } = render(WeekHeader, {
      weekNumber: 5,
      players,
      totals: {},
      activeWeekNumber: 5
    });
    expect(getByLabelText('Active week')).toBeTruthy();
    const header = container.querySelector('[data-week-header]');
    expect(header?.getAttribute('data-active')).toBe('true');
    expect(header?.getAttribute('aria-current')).toBe('true');
  });

  it('highlights top scorer when positive', () => {
    const { container, getByText } = render(WeekHeader, {
      weekNumber: 2,
      players,
      totals: { p1: 4, p2: -1, p3: 0 },
      activeWeekNumber: null
    });
    expect(getByText('+4')).toBeTruthy();
    const aliceEl = container.querySelector('[data-player-id="p1"]');
    expect(aliceEl?.getAttribute('data-top')).toBe('true');
    expect(aliceEl?.querySelector('[data-trophy]')).toBeTruthy();
  });

  it('no trophies if all totals zero', () => {
    const { container } = render(WeekHeader, {
      weekNumber: 1,
      players,
      totals: { p1: 0, p2: 0, p3: 0 },
      activeWeekNumber: null
    });
    expect(container.querySelector('[data-trophy]')).toBeNull();
  });

  it('ties show multiple trophies', () => {
    const { container } = render(WeekHeader, {
      weekNumber: 7,
      players,
      totals: { p1: 3, p2: 3, p3: 1 },
      activeWeekNumber: null
    });
    expect(container.querySelectorAll('[data-trophy]').length).toBe(2);
  });

  it('negative totals red, positives green, zero neutral', () => {
    const { getByText } = render(WeekHeader, {
      weekNumber: 4,
      players,
      totals: { p1: -2, p2: 0, p3: 5 },
      activeWeekNumber: null
    });
    expect(getByText('-2').className).toMatch(/text-red-600/);
    expect(getByText('+5').className).toMatch(/text-green-600/);
    expect(getByText('0').className).toMatch(/text-neutral-600/);
  });
});
