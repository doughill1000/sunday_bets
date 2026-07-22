// The one-line honors door (#741): #727's evergreen champion identity, compressed from the
// old ReigningChampionBanner and repointed at the Honors tab. Covers the "(you)" naming and
// that tapping it fires the tab-flip callback rather than navigating.
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import HonorsStrip from '../HonorsStrip.svelte';
import type { SeasonHonor } from '$lib/types/honors';

const CHAMPION: SeasonHonor = {
  season_year: 2025,
  user_id: 'u1',
  display_name: 'Doug',
  avatar_key: null,
  rank: 1,
  total_points: 100
};

describe('HonorsStrip', () => {
  it('renders the champion name and year and opens the Honors tab on tap', async () => {
    const onOpen = vi.fn();
    const { getByTestId } = render(HonorsStrip, {
      props: { reigningChampion: CHAMPION, onOpen }
    });
    const strip = getByTestId('honors-strip');
    expect(strip.textContent).toContain('Doug');
    expect(strip.textContent).toContain('2025 Champion');
    // A button, not a link: the Honors tab is a client flip on the host page.
    expect(strip.tagName).toBe('BUTTON');
    await fireEvent.click(strip);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('marks the strip "(you)" when the visitor is the reigning champion', () => {
    const { getByTestId } = render(HonorsStrip, {
      props: { reigningChampion: CHAMPION, currentUserId: 'u1', onOpen: () => {} }
    });
    expect(getByTestId('honors-strip').textContent).toContain('Doug (you)');
  });
});
