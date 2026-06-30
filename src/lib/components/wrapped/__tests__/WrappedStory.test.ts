import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import WrappedStory from '../WrappedStory.svelte';
import type { SeasonWrappedRow } from '$lib/types/server/seasonWrapped';
import type { PlayerWrappedFacts, LeagueWrappedFacts } from '$lib/types/server/seasonWrapped';

const playerFacts: PlayerWrappedFacts = {
  user_id: 'u1',
  display_name: 'Alice',
  rank: 2,
  total_points: 135,
  decisions: 18,
  record: { wins: 10, losses: 6, pushes: 2 },
  best_week: { week_number: 7, points: 22 },
  worst_week: { week_number: 3, points: 2 },
  allin: null,
  contrarian_wins: 0,
  contrarian_picks: 0,
  nemesis: null,
  badges: [],
  best_rank: 1,
  longest_streak: 4,
  opted_out: false
};

const playerRow: SeasonWrappedRow = {
  id: 'row-1',
  group_id: 'g1',
  season_year: 2024,
  scope: 'player',
  subject_user_id: 'u1',
  prose: 'What a season you had, Alice!',
  facts: playerFacts,
  is_fallback: false,
  model: 'gpt-5',
  prompt_tokens: 500,
  completion_tokens: 100,
  created_at: '2025-01-01T00:00:00Z'
};

const leagueFacts: LeagueWrappedFacts = {
  champion: { display_name: 'Bob', total_points: 200 },
  wooden_spoon: { display_name: 'Charlie', total_points: 50 },
  standings: [
    { user_id: 'u2', display_name: 'Bob', rank: 1, total_points: 200 },
    { user_id: 'u3', display_name: 'Alice', rank: 2, total_points: 135 },
    { user_id: 'u4', display_name: 'Charlie', rank: 3, total_points: 50 }
  ],
  title_badges: [
    { label: 'The Sharp', emoji: '🎯', holders: ['Bob'] },
    { label: 'The Grinder', emoji: '⚙️', holders: ['Alice'] }
  ],
  player_count: 3,
  biggest_climber: { display_name: 'Alice', from_rank: 5, to_rank: 2, delta: 3 },
  biggest_faller: { display_name: 'Charlie', from_rank: 1, to_rank: 3, delta: -2 },
  lead: { changes: 1, wire_to_wire: false, most_weeks_leader: { display_name: 'Bob', weeks: 8 } },
  longest_heater: { display_name: 'Bob', streak: 6 },
  title_margin: 65
};

const leagueRow: SeasonWrappedRow = {
  id: 'row-2',
  group_id: 'g1',
  season_year: 2024,
  scope: 'league',
  subject_user_id: null,
  prose: 'What a year for the league!',
  facts: leagueFacts,
  is_fallback: false,
  model: 'gpt-5',
  prompt_tokens: 800,
  completion_tokens: 200,
  created_at: '2025-01-01T00:00:00Z'
};

describe('WrappedStory — player', () => {
  it('renders the wrapped-story root testid', () => {
    render(WrappedStory, { props: { row: playerRow } });
    expect(screen.getByTestId('wrapped-story')).toBeInTheDocument();
  });

  it('renders the rank card', () => {
    render(WrappedStory, { props: { row: playerRow } });
    expect(screen.getByText('Season Rank')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('135 pts')).toBeInTheDocument();
  });

  it('renders the record card', () => {
    render(WrappedStory, { props: { row: playerRow } });
    expect(screen.getByText('10-6-2')).toBeInTheDocument();
  });

  it('renders the best week card when present', () => {
    render(WrappedStory, { props: { row: playerRow } });
    expect(screen.getByText('Week 7')).toBeInTheDocument();
    expect(screen.getByText('22 pts')).toBeInTheDocument();
  });

  it('renders the AI blurb', () => {
    render(WrappedStory, { props: { row: playerRow } });
    const blurb = screen.getByTestId('wrapped-blurb');
    expect(blurb).toBeInTheDocument();
    expect(blurb).toHaveTextContent('What a season you had, Alice!');
  });

  it('does not show a fallback note when is_fallback is false', () => {
    render(WrappedStory, { props: { row: playerRow } });
    expect(screen.queryByText(/deterministic summary/i)).not.toBeInTheDocument();
  });

  it('shows the fallback note when is_fallback is true', () => {
    const fallbackRow: SeasonWrappedRow = { ...playerRow, is_fallback: true };
    render(WrappedStory, { props: { row: fallbackRow } });
    expect(screen.getByText(/deterministic summary/i)).toBeInTheDocument();
  });

  it('does not render the badge showcase when the player earned none', () => {
    render(WrappedStory, { props: { row: playerRow } });
    expect(screen.queryByTestId('wrapped-badges')).not.toBeInTheDocument();
  });

  it('renders earned badges in a dedicated showcase, not as stat cards', () => {
    const row: SeasonWrappedRow = {
      ...playerRow,
      facts: {
        ...playerFacts,
        badges: [
          { id: 'sharp', label: 'The Sharp', emoji: '🎯', kind: 'title' },
          { id: 'centurion', label: 'Centurion', emoji: '💯', kind: 'milestone' }
        ]
      }
    };
    render(WrappedStory, { props: { row } });
    const showcase = screen.getByTestId('wrapped-badges');
    expect(showcase).toBeInTheDocument();
    expect(screen.getByText('Your Badges')).toBeInTheDocument();
    expect(screen.getByTestId('wrapped-badge-sharp')).toHaveTextContent('The Sharp');
    expect(screen.getByTestId('wrapped-badge-centurion')).toHaveTextContent('Centurion');
    // The showcase is separate from the numeric stat grid, which still renders its cards.
    expect(screen.getAllByTestId('wrapped-card').length).toBeGreaterThan(0);
  });
});

describe('WrappedStory — league', () => {
  it('renders the wrapped-story root testid', () => {
    render(WrappedStory, { props: { row: leagueRow } });
    expect(screen.getByTestId('wrapped-story')).toBeInTheDocument();
  });

  it('renders the champion card', () => {
    render(WrappedStory, { props: { row: leagueRow } });
    expect(screen.getByText('Champion')).toBeInTheDocument();
    // Bob appears in the Champion card and in the standings — confirm at least one instance.
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
    // "200 pts" appears in both the Champion card sub and the standings row.
    expect(screen.getAllByText('200 pts').length).toBeGreaterThan(0);
  });

  it('renders the standings list', () => {
    render(WrappedStory, { props: { row: leagueRow } });
    expect(screen.getByText('Season Standings')).toBeInTheDocument();
    // Charlie appears in both the wooden spoon card and the standings.
    expect(screen.getAllByText('Charlie').length).toBeGreaterThan(0);
  });

  it('renders the season title badges', () => {
    render(WrappedStory, { props: { row: leagueRow } });
    expect(screen.getByText('Season Titles')).toBeInTheDocument();
    expect(screen.getByText(/The Sharp/)).toBeInTheDocument();
    expect(screen.getByText(/The Grinder/)).toBeInTheDocument();
  });

  it('renders the AI blurb', () => {
    render(WrappedStory, { props: { row: leagueRow } });
    const blurb = screen.getByTestId('wrapped-blurb');
    expect(blurb).toBeInTheDocument();
    expect(blurb).toHaveTextContent('What a year for the league!');
  });
});
