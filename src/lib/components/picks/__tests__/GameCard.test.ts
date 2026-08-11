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
  // Reset the kickoffPassed mock too — it is module-level, so a test that flips it to
  // `true` would otherwise leak "started" into every test declared after it.
  beforeEach(async () => {
    setPicks({});
    const rules = await import('$lib/domain/rules');
    (rules.kickoffPassed as any).mockReturnValue(false);
  });

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

  it('disables Lock in until a weight is chosen', () => {
    setPicks({ g1: { selected: { team: 'home' } } as any });
    render(GameCard, { props: { game, initialized: true } });
    expect(screen.getByTestId('lock-in')).toBeDisabled();
  });

  it('enables Lock in once a team and weight are staged', () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'M' } } as any });
    render(GameCard, { props: { game, initialized: true } });
    expect(screen.getByTestId('lock-in')).toBeEnabled();
  });

  it('shows “Kickoff passed” message when rules say started', async () => {
    const rules = await import('$lib/domain/rules');
    (rules.kickoffPassed as any).mockReturnValue(true);
    render(GameCard, { props: { game, initialized: true } });
    expect(screen.getByText(/Kickoff passed — picks locked/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // #802 — a game with no posted line is not pickable
  // -------------------------------------------------------------------------
  describe('with no posted line (spreadValue === null)', () => {
    const unlined = { ...game, spreadValue: null };

    it('marks the line as not posted instead of showing it as a value', () => {
      render(GameCard, { props: { game: unlined, initialized: true } });
      expect(screen.getByTestId('no-line-chip')).toHaveTextContent('Line not posted yet');
      expect(screen.getByTestId('no-line-note')).toHaveTextContent(/pick it once it's up/);
      expect(screen.queryByText('No line')).not.toBeInTheDocument();
    });

    it('disables Lock in even with a team and weight staged', () => {
      setPicks({ g1: { selected: { team: 'home', weight: 'M' } } as any });
      render(GameCard, { props: { game: unlined, initialized: true } });
      expect(screen.getByTestId('lock-in')).toBeDisabled();
    });

    it('does not offer team or weight selection as live controls', () => {
      render(GameCard, { props: { game: unlined, initialized: true } });
      for (const btn of screen.getByTestId('team-select').querySelectorAll('button')) {
        expect(btn).toBeDisabled();
      }
      expect(screen.getByTestId('weight-item-M')).toBeDisabled();
    });

    it('still renders a locked pick’s badge when the line later disappears', () => {
      setPicks({ g1: { lockedPick: { team: 'home', weight: 'H' } } as any });
      render(GameCard, { props: { game: unlined, initialized: true } });
      expect(screen.getByText('Locked')).toBeInTheDocument();
      expect(screen.getByText(/CIN\s+@ H/)).toBeInTheDocument(); // no spread text, no crash
    });

    it('becomes pickable when the line arrives, without a remount', async () => {
      setPicks({ g1: { selected: { team: 'home', weight: 'M' } } as any });
      const { rerender } = render(GameCard, { props: { game: unlined, initialized: true } });
      expect(screen.getByTestId('lock-in')).toBeDisabled();

      await rerender({ game: { ...game, spreadValue: 3.5 }, initialized: true });

      expect(screen.queryByTestId('no-line-chip')).not.toBeInTheDocument();
      expect(screen.getByText('CIN -3.5')).toBeInTheDocument();
      expect(screen.getByTestId('lock-in')).toBeEnabled();
    });
  });

  // A pick'em is a real line, not a missing one — it must stay fully pickable (#802).
  it('keeps a pick’em (spreadValue === 0) fully pickable', () => {
    setPicks({ g1: { selected: { team: 'home', weight: 'M' } } as any });
    render(GameCard, { props: { game: { ...game, spreadValue: 0 }, initialized: true } });
    expect(screen.getByText('PK')).toBeInTheDocument();
    expect(screen.queryByTestId('no-line-chip')).not.toBeInTheDocument();
    expect(screen.getByTestId('lock-in')).toBeEnabled();
    expect(screen.getByTestId('weight-item-M')).toBeEnabled();
  });
});
