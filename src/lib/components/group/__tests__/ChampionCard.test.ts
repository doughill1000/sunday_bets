// The trophy room's hero (#741): crowned when the viewed season has a champion, and a
// designed "not decided yet" zero-state while it doesn't — the empty slot narrates the race
// (ADR-0035 §3 made "nobody yet" a legitimate state; DESIGN.md P11 makes it a designed one).
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import ChampionCard from '../ChampionCard.svelte';
import type { SeasonHonor } from '$lib/types/honors';

const CHAMPION: SeasonHonor = {
  season_year: 2025,
  user_id: 'u1',
  display_name: 'Doug',
  avatar_key: null,
  rank: 1,
  total_points: 170
};

describe('ChampionCard', () => {
  it('renders the crowned state with name, year, points, and record', () => {
    const { getByTestId } = render(ChampionCard, {
      props: {
        champion: CHAMPION,
        isReigning: true,
        seasonYear: 2025,
        seasonInProgress: false,
        record: '49-4-2',
        currentUserId: 'u1'
      }
    });
    const card = getByTestId('champion-card');
    expect(card.textContent).toContain('2025 Champion');
    expect(card.textContent).toContain('Doug (you)');
    expect(card.textContent).toContain('170 pts');
    expect(card.textContent).toContain('49-4-2');
    expect(card.getAttribute('data-state')).toBeNull();
  });

  it('renders the in-season zero-state with the leader line and a standings jump', async () => {
    const onStandings = vi.fn();
    const { getByTestId } = render(ChampionCard, {
      props: {
        champion: null,
        seasonYear: 2026,
        seasonInProgress: true,
        leaderLine: 'Nate leads through Week 6',
        onStandings
      }
    });
    const card = getByTestId('champion-card');
    expect(card.getAttribute('data-state')).toBe('undecided');
    expect(card.textContent).toContain('2026 Champion · not decided');
    expect(card.textContent).toContain('Crowned when the final week grades');
    expect(card.textContent).toContain('Nate leads through Week 6');
    await fireEvent.click(getByTestId('champion-zero-standings'));
    expect(onStandings).toHaveBeenCalledOnce();
  });

  it('renders a concluded season with no recorded champion honestly', () => {
    const { getByTestId, queryByTestId } = render(ChampionCard, {
      props: { champion: null, seasonYear: 2023, seasonInProgress: false }
    });
    const card = getByTestId('champion-card');
    expect(card.textContent).toContain('No champion recorded');
    // No race to narrate on a dead season: no leader line, no standings jump.
    expect(queryByTestId('champion-zero-standings')).toBeNull();
  });
});
