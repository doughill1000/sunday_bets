// The awards card's axis grouping (#635). The engine decides whether a badge is deserved
// (badges.test.ts); this covers the half only the card can answer — that an unearned axis
// costs no lines, and that a half-earned one says so out loud.
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import LeagueHonors from '../LeagueHonors.svelte';
import type { BadgeAward, BadgeId, LeagueHonors as Honors } from '$lib/types/honors';

const HONORS: Honors = {
  reigningChampion: {
    season_year: 2025,
    user_id: 'u1',
    display_name: 'Doug',
    avatar_key: null,
    rank: 1,
    total_points: 100
  },
  trophyCase: [
    {
      season_year: 2025,
      user_id: 'u1',
      display_name: 'Doug',
      avatar_key: null,
      rank: 1,
      total_points: 100
    }
  ],
  woodenSpoon: null
};

function badge(id: BadgeId, holder: string): BadgeAward {
  return {
    id,
    label: id,
    emoji: '🏅',
    flavor: 'flavor',
    description: 'description',
    kind: 'title',
    holders: [{ user_id: holder, display_name: holder }]
  };
}

function renderCard(badges: BadgeAward[]) {
  return render(LeagueHonors, { props: { honors: HONORS, badges, selectedSeason: 2025 } });
}

describe('LeagueHonors — reigning champion hoisted out (#727)', () => {
  it('renders no reigning-champion block; the card opens on the trophy case', () => {
    const { queryByTestId, getByTestId } = renderCard([]);
    expect(queryByTestId('reigning-champion')).toBeNull();
    expect(getByTestId('trophy-case')).toBeTruthy();
  });
});

describe('LeagueHonors — axis grouping', () => {
  it('groups both faces of an axis under one heading', () => {
    const { getByTestId, getByText } = renderCard([
      badge('dog-lover', 'Doug'),
      badge('chalk-eater', 'Brett')
    ]);
    expect(getByTestId('axis-group-Line-lean')).toBeTruthy();
    expect(getByTestId('badge-chip-dog-lover')).toBeTruthy();
    expect(getByTestId('badge-chip-chalk-eater')).toBeTruthy();
    // Both ends earned → nothing is unclaimed, so the heading stays bare.
    expect(getByText('Line lean').textContent).not.toContain('unclaimed');
  });

  it('names the empty end when only one face is earned — the 2025 line-lean case', () => {
    const { getByTestId, queryByTestId } = renderCard([badge('dog-lover', 'Doug')]);
    expect(getByTestId('axis-group-Line-lean').textContent).toContain('Chalk end unclaimed');
    expect(queryByTestId('badge-chip-chalk-eater')).toBeNull();
  });

  it('renders no heading, no row, and no placeholder for an axis nobody earned', () => {
    const { queryByTestId, getByTestId } = renderCard([badge('the-grinder', 'Doug')]);
    expect(queryByTestId('axis-group-Line-lean')).toBeNull();
    // The non-axis title still finds a home rather than vanishing with the axis.
    expect(getByTestId('awards-titles').textContent).toContain('the-grinder');
  });

  it('drops awards the legend cannot explain, so a stale fixture cannot resurrect them', () => {
    // #647 cut hot-hand from the catalog entirely, so it has no glossary entry and the
    // engine can never award it again — but the demo snapshot was frozen while it still
    // could, and a chip the legend can't explain is exactly the unearnable jewellery this
    // card exists to stop showing. The cast is the point: a stale fixture carries an id
    // that is no longer in the `BadgeId` union, which only a runtime guard can catch.
    const cutBadge = { ...badge('the-ghost', 'Mike'), id: 'hot-hand' as BadgeId };
    const { queryByTestId, getByTestId } = renderCard([badge('the-grinder', 'Doug'), cutBadge]);
    expect(queryByTestId('badge-chip-hot-hand')).toBeNull();
    expect(getByTestId('badge-chip-the-grinder')).toBeTruthy();
  });

  it('renders the crowd-lean axis now that #649 gave it a zero', () => {
    // The first real exercise of #635's axis-major pivot with two live axes: each axis
    // groups independently, and a half-earned one still names its empty end.
    const { getByTestId } = renderCard([badge('lone-wolf', 'Mike'), badge('dog-lover', 'Doug')]);
    expect(getByTestId('axis-group-Crowd-lean').textContent).toContain('Flock end unclaimed');
    expect(getByTestId('axis-group-Line-lean').textContent).toContain('Chalk end unclaimed');
    expect(getByTestId('badge-chip-lone-wolf')).toBeTruthy();
    expect(getByTestId('badge-chip-dog-lover')).toBeTruthy();
  });

  it('lists a player once per award they hold, not once per player', () => {
    // The deliberate consequence of the axis-major pivot: two badges, two rows, same face.
    const { getByTestId } = renderCard([badge('dog-lover', 'Doug'), badge('the-grinder', 'Doug')]);
    expect(getByTestId('badge-chip-dog-lover')).toBeTruthy();
    expect(getByTestId('badge-chip-the-grinder')).toBeTruthy();
  });
});
