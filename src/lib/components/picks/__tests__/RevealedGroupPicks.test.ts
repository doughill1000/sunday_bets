// src/lib/components/picks/__tests__/RevealedGroupPicks.test.ts
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import RevealedGroupPicks from '$lib/components/picks/RevealedGroupPicks.svelte';
import type { GroupPickEntry } from '$lib/types/picks';

const ME = 'me-doug';

// Scenario mirrors the NYJ @ PIT matchup: PIT is home, NYJ is away.
function makePicks(): GroupPickEntry[] {
  return [
    { userId: ME, displayName: 'Doug', avatarKey: 'football', gameId: 'g1', pickedSide: 'home', weight: 'M', pickedTeamShort: 'PIT' }, // prettier-ignore
    { userId: 'hank', displayName: 'Hank', avatarKey: null, gameId: 'g1', pickedSide: 'away', weight: 'A', pickedTeamShort: 'NYJ' }, // prettier-ignore
    { userId: 'charlie', displayName: 'Charlie', avatarKey: 'shark', gameId: 'g1', pickedSide: 'home', weight: 'A', pickedTeamShort: 'PIT' }, // prettier-ignore
    { userId: 'frank', displayName: 'Frank', avatarKey: null, gameId: 'g1', pickedSide: 'away', weight: 'A', pickedTeamShort: 'NYJ' }, // prettier-ignore
    { userId: 'beth', displayName: 'Beth', avatarKey: null, gameId: 'g1', pickedSide: 'home', weight: 'L', pickedTeamShort: 'PIT' }, // prettier-ignore
    { userId: 'mike', displayName: 'Mike', avatarKey: null, gameId: 'g1', pickedSide: 'away', weight: 'A', pickedTeamShort: 'NYJ' } // prettier-ignore
  ];
}

describe('RevealedGroupPicks', () => {
  it('renders nothing when there are no picks', () => {
    const { container } = render(RevealedGroupPicks, { props: { picks: [], myUserId: ME } });
    expect(container.textContent).toBe('');
  });

  it('groups picks into one block per team, away team block first', () => {
    render(RevealedGroupPicks, { props: { picks: makePicks(), myUserId: ME } });

    const labels = screen.getAllByText(/^(NYJ|PIT)$/);
    expect(labels.map((el) => el.textContent)).toEqual(['NYJ', 'PIT']);
  });

  it('orders members with the current user first, then heaviest weight, then name', () => {
    render(RevealedGroupPicks, { props: { picks: makePicks(), myUserId: ME } });

    // DOM order spans both team blocks: NYJ (away) then PIT (home).
    // NYJ: all All-In, so alphabetical -> Frank, Hank, Mike.
    // PIT: me first (Doug), then heaviest -> Charlie (A) before Beth (L).
    const names = screen.getAllByRole('listitem').map((li) => li.textContent?.trim());
    expect(names?.[0]).toMatch(/Frank/);
    expect(names?.[1]).toMatch(/Hank/);
    expect(names?.[2]).toMatch(/Mike/);
    expect(names?.[3]).toMatch(/Doug \(you\)/);
    expect(names?.[4]).toMatch(/Charlie/);
    expect(names?.[5]).toMatch(/Beth/);
  });

  it('marks the current user with "(you)" and bold styling', () => {
    render(RevealedGroupPicks, { props: { picks: makePicks(), myUserId: ME } });

    const meLabel = screen.getByText('Doug (you)');
    expect(meLabel.className).toContain('font-semibold');
  });

  it('shows each member weight code', () => {
    render(RevealedGroupPicks, { props: { picks: makePicks(), myUserId: ME } });

    const doug = screen.getByText('Doug (you)').closest('li');
    expect(doug?.textContent).toContain('M');
  });
});
