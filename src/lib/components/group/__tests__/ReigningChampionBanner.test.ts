// The evergreen champion banner (#727): promoted out of LeagueHonors so it renders above
// both /league tabs. Covers the "(you)" naming and the wrappedHref override the demo needs.
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import ReigningChampionBanner from '../ReigningChampionBanner.svelte';
import type { SeasonHonor } from '$lib/types/honors';

const CHAMPION: SeasonHonor = {
  season_year: 2025,
  user_id: 'u1',
  display_name: 'Doug',
  avatar_key: null,
  rank: 1,
  total_points: 100
};

describe('ReigningChampionBanner', () => {
  it('renders the champion name, year, and links to Wrapped', () => {
    const { getByTestId } = render(ReigningChampionBanner, {
      props: { reigningChampion: CHAMPION }
    });
    const banner = getByTestId('reigning-champion-banner');
    expect(banner.textContent).toContain('Doug');
    expect(banner.textContent).toContain('2025 Champion');
    expect(banner.getAttribute('href')).toBe('/wrapped');
  });

  it('marks the banner "(you)" when the visitor is the reigning champion', () => {
    const { getByTestId } = render(ReigningChampionBanner, {
      props: { reigningChampion: CHAMPION, currentUserId: 'u1' }
    });
    expect(getByTestId('reigning-champion-banner').textContent).toContain('Doug (you)');
  });

  it('respects an overridden wrappedHref (the public demo)', () => {
    const { getByTestId } = render(ReigningChampionBanner, {
      props: { reigningChampion: CHAMPION, wrappedHref: '/demo/wrapped' }
    });
    expect(getByTestId('reigning-champion-banner').getAttribute('href')).toBe('/demo/wrapped');
  });
});
