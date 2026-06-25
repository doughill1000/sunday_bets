import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameCard from '../GameCard.svelte';
import { setPicks } from '../../../stores/picks';

vi.mock('$lib/domain/rules', () => ({
  kickoffPassed: vi.fn(() => false),
  findAllInHolder: vi.fn(() => null),
  allInIntent: vi.fn(() => ({ kind: 'confirm' }))
}));

const game = {
  id: 'g1',
  away: 'JAX',
  home: 'CIN',
  kickoff: '2025-09-14T17:00:00Z',
  homeTeamId: 'H',
  awayTeamId: 'A',
  spreadTeamId: 'H',
  spreadValue: 3.5
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

  it('prompts for a weight when a team is staged with no weight', () => {
    setPicks({ g1: { selected: { team: 'home' } } as any });
    render(GameCard, { props: { game, initialized: true } });
    expect(screen.getByText(/Choose a weight to save/)).toBeInTheDocument();
  });

  it('does not prompt for a weight once one is chosen', () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'M' } } as any });
    render(GameCard, { props: { game, initialized: true } });
    expect(screen.queryByText(/Choose a weight to save/)).not.toBeInTheDocument();
  });

  it('shows “Kickoff passed” message when rules say started', async () => {
    const rules = await import('$lib/domain/rules');
    (rules.kickoffPassed as any).mockReturnValue(true);
    render(GameCard, { props: { game, initialized: true } });
    expect(screen.getByText(/Kickoff passed — picks locked/)).toBeInTheDocument();
  });
});
