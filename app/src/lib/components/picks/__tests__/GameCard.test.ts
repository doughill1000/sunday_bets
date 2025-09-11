import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameCard from '../GameCard.svelte';
import { setPicks } from '../../../stores/picks';

vi.mock('$lib/domain/rules', () => ({
  kickoffPassed: vi.fn(() => false),
  canUseAllIn: vi.fn(() => true),
}));

const game = {
  id: 'g1',
  away: 'JAX',
  home: 'CIN',
  kickoff: '2025-09-14T17:00:00Z',
  homeTeamId: 'H',
  awayTeamId: 'A',
  spreadTeamId: 'H',
  spreadValue: 3.5,
} as any;

describe('GameCard', () => {
  beforeEach(() => setPicks({}));

  it('renders matchup and line', () => {
    render(GameCard, { props: { game, initialized: true } });
    expect(screen.getByText('JAX @ CIN')).toBeInTheDocument();
    expect(screen.getByText('CIN -3.5')).toBeInTheDocument();
  });

  it('shows Locked badge when lockedPick exists', () => {
    setPicks({ g1: { lockedPick: { team: 'home', weight: 'H' } } as any });
    render(GameCard, { props: { game, initialized: true } });
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText(/CIN -3.5 @ H/)).toBeInTheDocument(); // “@ H” because weight renders after @
  });

  it('shows “Kickoff passed” message when rules say started', async () => {
    const rules = await import('$lib/domain/rules');
    (rules.kickoffPassed as any).mockReturnValue(true);
    render(GameCard, { props: { game, initialized: true } });
    expect(screen.getByText(/Kickoff passed — picks locked/)).toBeInTheDocument();
  });
});
