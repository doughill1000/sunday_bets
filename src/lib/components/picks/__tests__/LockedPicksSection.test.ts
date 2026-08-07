import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import LockedPicksSection from '../LockedPicksSection.svelte';
import { setPicks } from '../../../stores/picks';
import type { PickGame } from '$lib/types/games';

const game: PickGame = {
  id: 'g1',
  kickoff: '2099-01-01T18:00:00Z',
  home: 'Home Team',
  away: 'Away Team',
  homeTeamId: 1,
  awayTeamId: 2,
  spreadTeamId: 1,
  spreadValue: -3
};

describe('LockedPicksSection (committed pick warnings, issue #542)', () => {
  beforeEach(() => {
    setPicks({});
  });

  it('renders a durable, announced warning when a lock partially applied', () => {
    setPicks({
      g1: {
        lockedPick: { team: 'home', weight: 'M' },
        saveError: "Saved — couldn't apply to 2 groups"
      }
    });

    render(LockedPicksSection, { props: { games: [game], now: Date.now() } });

    const note = screen.getByRole('status');
    expect(note).toHaveTextContent("Saved — couldn't apply to 2 groups");
  });

  it('renders nothing extra when the lock fully applied (no saveError)', () => {
    setPicks({
      g1: { lockedPick: { team: 'home', weight: 'M' } }
    });

    render(LockedPicksSection, { props: { games: [game], now: Date.now() } });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('LockedPicksSection (status vs action on a committed row, issue #787)', () => {
  beforeEach(() => {
    setPicks({ g1: { lockedPick: { team: 'home', weight: 'M' } } });
  });

  it('renders "Locked" as status text, not a control', () => {
    render(LockedPicksSection, { props: { games: [game], now: Date.now() } });

    // The only button on the row is Unlock — "Locked" must not be pressable, or the
    // two read as a segmented toggle pair.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('data-testid', 'unlock-pick');
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('labels the action "Unlock" without a redundant lock glyph', () => {
    render(LockedPicksSection, { props: { games: [game], now: Date.now() } });

    expect(screen.getByTestId('unlock-pick').textContent?.trim()).toBe('Unlock');
  });

  // Svelte trims leading whitespace inside an element, so a plain space in the sr-only
  // span collapsed the label to "Committedpicks (1)". Guard the spacing, not just the text.
  it('keeps the pick count in the summary’s accessible name, correctly spaced', () => {
    render(LockedPicksSection, { props: { games: [game], now: Date.now() } });

    const summary = screen.getByTestId('committed-summary');
    expect(summary.textContent?.replace(/\s+/g, ' ').trim()).toBe('Committed picks (1)');
  });

  it('hides the Unlock action in readonly/demo mode but keeps the locked status', () => {
    render(LockedPicksSection, { props: { games: [game], now: Date.now(), readonly: true } });

    expect(screen.queryByTestId('unlock-pick')).not.toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });
});
