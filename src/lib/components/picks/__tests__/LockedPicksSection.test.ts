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
