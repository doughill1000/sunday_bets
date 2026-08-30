import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import WeeklyHardware from '../WeeklyHardware.svelte';
import {
  WEEKLY_AWARD_FLAVORS,
  type WeeklyAward,
  type WeeklyHardware as Hardware
} from '$lib/domain/weeklyAwards';

/**
 * The card's two non-data behaviours (#866): where the recap link sits, and each award's detail
 * line. e2e cannot cover the link position -- the seeded active week keeps one unplayed game
 * (#832), so it never fully grades and the card never mounts.
 */
const holder = (user_id: string, display_name: string) => ({ user_id, display_name });

function award(a: Pick<WeeklyAward, 'id'> & Record<string, unknown>): WeeklyAward {
  return { ...WEEKLY_AWARD_FLAVORS[a.id], ...a } as WeeklyAward;
}

function hardware(awards: WeeklyAward[]): Hardware {
  return { week_number: 7, awards };
}

const GAME_BALL = award({ id: 'game-ball', holders: [holder('a', 'Al')], points: 12 });
const CONTRARIAN = award({
  id: 'contrarian-win',
  holders: [holder('a', 'Al')],
  consensus_pct: 16.5
});

describe('WeeklyHardware — recap link placement (#866)', () => {
  it('renders the recap link above the tiles, not below them', () => {
    const { getByTestId } = render(WeeklyHardware, {
      props: {
        hardware: hardware([GAME_BALL]),
        recapHref: '/recap#week-7',
        recapLabel: 'Read week 7'
      }
    });

    const link = getByTestId('weekly-hardware-recap-link');
    const tiles = getByTestId('weekly-hardware');
    // DOCUMENT_POSITION_FOLLOWING: `tiles` comes after `link` in document order.
    expect(link.compareDocumentPosition(tiles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps its label logic — falls back to "Season recaps" with no label given', () => {
    const { getByTestId } = render(WeeklyHardware, {
      props: { hardware: hardware([GAME_BALL]), recapHref: '/recap' }
    });
    expect(getByTestId('weekly-hardware-recap-link').textContent).toContain('Season recaps');
  });

  it('renders no link at all when the surface passes none', () => {
    const { queryByTestId } = render(WeeklyHardware, {
      props: { hardware: hardware([GAME_BALL]) }
    });
    expect(queryByTestId('weekly-hardware-recap-link')).toBeNull();
  });
});

describe('WeeklyHardware — award detail lines', () => {
  it('reads points for the Game Ball and consensus for the Contrarian', () => {
    const { getByTestId } = render(WeeklyHardware, {
      props: { hardware: hardware([GAME_BALL, CONTRARIAN]) }
    });
    expect(getByTestId('weekly-award-game-ball').textContent).toContain('+12 pts');
    expect(getByTestId('weekly-award-contrarian-win').textContent).toContain('16.5% took it');
  });

  it('reads the Bullseye as a single landed All-In', () => {
    const { getByTestId } = render(WeeklyHardware, {
      props: { hardware: hardware([award({ id: 'bullseye', holders: [holder('a', 'Al')] })]) }
    });
    const tile = getByTestId('weekly-award-bullseye');
    expect(tile.textContent).toContain('Bullseye');
    expect(tile.textContent).toContain('Al');
    expect(tile.textContent).toContain('All-In landed');
  });

  it('pluralises the Bullseye for co-winners and lists every holder', () => {
    const { getByTestId } = render(WeeklyHardware, {
      props: {
        hardware: hardware([
          award({ id: 'bullseye', holders: [holder('a', 'Al'), holder('b', 'Bo')] })
        ])
      }
    });
    const tile = getByTestId('weekly-award-bullseye');
    expect(tile.textContent).toContain('Al');
    expect(tile.textContent).toContain('Bo');
    expect(tile.textContent).toContain('2 All-Ins landed');
  });

  it('marks the viewer with "(you)" wherever they hold an award', () => {
    const { getByTestId } = render(WeeklyHardware, {
      props: { hardware: hardware([GAME_BALL]), currentUserId: 'a' }
    });
    expect(getByTestId('weekly-award-game-ball').textContent).toContain('Al (you)');
  });
});
