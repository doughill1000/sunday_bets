// src/lib/components/picks/__tests__/AllInDeclarations.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import AllInDeclarations from '$lib/components/picks/AllInDeclarations.svelte';
import type { GroupPickEntry } from '$lib/types/picks';
import type { PickGame } from '$lib/types/games';

const ME = 'me-doug';

function game(id: string, away: string, home: string, kickoff: string): PickGame {
  return {
    id,
    kickoff,
    home,
    away,
    homeTeamId: null,
    awayTeamId: null,
    spreadTeamId: null,
    spreadValue: null
  };
}

// g1 (NYJ @ PIT) kicks off before g2 (PHI @ DAL).
function makeGames(): PickGame[] {
  return [
    game('g1', 'NYJ', 'PIT', '2026-01-01T18:00:00Z'),
    game('g2', 'PHI', 'DAL', '2026-01-02T18:00:00Z')
  ];
}

// All entries are weight='A' — the RPC only ever returns All-Ins.
function makeDeclarations(): GroupPickEntry[] {
  return [
    { userId: 'hank', displayName: 'Hank', avatarKey: null, gameId: 'g1', pickedSide: 'away', weight: 'A', pickedTeamShort: 'NYJ' }, // prettier-ignore
    { userId: ME, displayName: 'Doug', avatarKey: 'football', gameId: 'g1', pickedSide: 'home', weight: 'A', pickedTeamShort: 'PIT' }, // prettier-ignore
    { userId: 'beth', displayName: 'Beth', avatarKey: null, gameId: 'g1', pickedSide: 'home', weight: 'A', pickedTeamShort: 'PIT' }, // prettier-ignore
    { userId: 'charlie', displayName: 'Charlie', avatarKey: 'shark', gameId: 'g2', pickedSide: 'away', weight: 'A', pickedTeamShort: 'PHI' } // prettier-ignore
  ];
}

describe('AllInDeclarations', () => {
  it('shows an empty state when there are no declarations', () => {
    render(AllInDeclarations, { props: { declarations: [], games: [], myUserId: ME } });
    expect(screen.getByText(/No All-Ins declared yet/i)).toBeTruthy();
  });

  it('renders one matchup block per game, earliest kickoff first', () => {
    render(AllInDeclarations, {
      props: { declarations: makeDeclarations(), games: makeGames(), myUserId: ME }
    });
    const labels = screen.getAllByText(/^(NYJ @ PIT|PHI @ DAL)$/);
    expect(labels.map((el) => el.textContent)).toEqual(['NYJ @ PIT', 'PHI @ DAL']);
  });

  it('shows each member on the team they went All-In on', () => {
    render(AllInDeclarations, {
      props: { declarations: makeDeclarations(), games: makeGames(), myUserId: ME }
    });
    const doug = screen.getByText('Doug (you)').closest('li');
    expect(doug?.textContent).toContain('PIT');
    expect(doug?.textContent).toContain('All-In');
  });

  it('orders members with the current user first, then alphabetical', () => {
    render(AllInDeclarations, {
      props: { declarations: makeDeclarations(), games: makeGames(), myUserId: ME }
    });
    // g1 comes first (earliest kickoff): Doug (you), then Beth, then Hank.
    const entries = screen.getAllByTestId('all-in-entry').map((li) => li.textContent?.trim());
    expect(entries[0]).toMatch(/Doug \(you\)/);
    expect(entries[1]).toMatch(/Beth/);
    expect(entries[2]).toMatch(/Hank/);
    expect(entries[3]).toMatch(/Charlie/);
  });

  it('marks the current user with "(you)" and bold styling', () => {
    render(AllInDeclarations, {
      props: { declarations: makeDeclarations(), games: makeGames(), myUserId: ME }
    });
    const meLabel = screen.getByText('Doug (you)');
    expect(meLabel.className).toContain('font-semibold');
  });

  it('still lists a declaration whose game is missing from the games list', () => {
    render(AllInDeclarations, {
      props: { declarations: makeDeclarations(), games: [], myUserId: ME }
    });
    expect(screen.getAllByTestId('all-in-entry')).toHaveLength(4);
  });
});
