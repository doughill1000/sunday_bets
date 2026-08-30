// The honors door (#741, made evergreen by #867): covers each of the three states it can
// render, the "(you)" naming, the brass new-count pip, and that tapping it fires the tab-flip
// callback rather than navigating.
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import HonorsStrip from '../HonorsStrip.svelte';
import type { HonorsDoorState } from '$lib/ui/honorsDoor';

const CROWNED: HonorsDoorState = {
  kind: 'crowned',
  champion: {
    season_year: 2025,
    user_id: 'u1',
    display_name: 'Doug',
    avatar_key: null,
    rank: 1,
    total_points: 100
  }
};

const SETTLED: HonorsDoorState = {
  kind: 'settled',
  emoji: '🏆',
  label: 'Week Winner',
  holderName: 'Nate',
  holderUserId: 'u2',
  throughWeek: 6
};

describe('HonorsStrip', () => {
  it('renders the champion name and year and opens the Honors tab on tap', async () => {
    const onOpen = vi.fn();
    const { getByTestId } = render(HonorsStrip, { props: { state: CROWNED, onOpen } });
    const strip = getByTestId('honors-strip');
    expect(strip.textContent).toContain('Doug');
    expect(strip.textContent).toContain('2025 Champion');
    // A button, not a link: the Honors tab is a client flip on the host page.
    expect(strip.tagName).toBe('BUTTON');
    await fireEvent.click(strip);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('marks the strip "(you)" when the visitor is the champion', () => {
    const { getByTestId } = render(HonorsStrip, {
      props: { state: CROWNED, currentUserId: 'u1', onOpen: () => {} }
    });
    expect(getByTestId('honors-strip').textContent).toContain('Doug (you)');
  });

  it('names the freshest settled title and dates it in-season', () => {
    const { getByTestId } = render(HonorsStrip, { props: { state: SETTLED, onOpen: () => {} } });
    const strip = getByTestId('honors-strip');
    expect(strip.textContent).toContain('Week Winner');
    expect(strip.textContent).toContain('Nate');
    expect(strip.textContent).toContain('Through Week 6');
  });

  it('marks a settled title "(you)" for its holder', () => {
    const { getByTestId } = render(HonorsStrip, {
      props: { state: SETTLED, currentUserId: 'u2', onOpen: () => {} }
    });
    expect(getByTestId('honors-strip').textContent).toContain('Nate (you)');
  });

  it('degrades to a plain "Trophy room" door when nothing has settled', () => {
    // The whole point of #867: the door is never absent, so a league with no champion and no
    // titles still has a visible way in.
    const { getByTestId } = render(HonorsStrip, {
      props: { state: { kind: 'empty' } satisfies HonorsDoorState, onOpen: () => {} }
    });
    const strip = getByTestId('honors-strip');
    expect(strip.textContent).toContain('Trophy room');
    expect(strip.getAttribute('data-door-state')).toBe('empty');
  });

  it('shows the new-count pip when something is waiting', () => {
    const { getByTestId } = render(HonorsStrip, {
      props: { state: SETTLED, newCount: 3, onOpen: () => {} }
    });
    expect(getByTestId('honors-new-pip').textContent).toContain('3 new');
  });

  it('hides the pip once the room has been seen', () => {
    const { queryByTestId } = render(HonorsStrip, {
      props: { state: SETTLED, newCount: 0, onOpen: () => {} }
    });
    expect(queryByTestId('honors-new-pip')).toBeNull();
  });
});
