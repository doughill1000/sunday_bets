import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PicksBoard from '../PicksBoard.svelte';
import type { PickGame } from '$lib/types/games';
import type { PickEntry } from '$lib/types/picks';

// The kickoff boundary (#832). `/picks` holds only what you can still act on: unpicked cards
// and locked-but-not-started picks. A game that has kicked off leaves the page entirely — live,
// final-unofficial and graded alike — and is represented by the handoff strip to `/week`.
//
// This replaces the #822 live-window regression test, which guarded a live layer this board no
// longer has; the gate it protected (`activeLiveScores`) still has its own cover in
// `$lib/live/__tests__/config.test.ts` and still guards `/week`.

function game(id: string, kickoffMsFromNow: number, over: Partial<PickGame> = {}): PickGame {
  return {
    id,
    kickoff: new Date(Date.now() + kickoffMsFromNow).toISOString(),
    home: 'KC',
    away: 'BUF',
    homeTeamId: 1,
    awayTeamId: 2,
    spreadTeamId: 1,
    spreadValue: -3,
    ...over
  };
}

const HOUR = 60 * 60 * 1000;
const LOCKED: PickEntry = { lockedPick: { team: 'home', weight: 'M' } };

describe('the /picks kickoff boundary', () => {
  it('keeps a locked pick on the board — with its Unlock — until kickoff', () => {
    render(PicksBoard, {
      props: { games: [game('g1', HOUR)], initialPicks: { g1: LOCKED }, userId: 'u1' }
    });

    expect(screen.getByTestId('committed-row')).toBeInTheDocument();
    expect(screen.getByTestId('committed-matchup')).toHaveTextContent('BUF @ KC');
    expect(screen.getByTestId('unlock-pick')).toBeInTheDocument();
    // Nothing has started, so there is no handoff to make.
    expect(screen.queryByTestId('week-underway-strip')).not.toBeInTheDocument();
  });

  it('removes a kicked-off game from the board entirely, card and committed row alike', () => {
    render(PicksBoard, {
      props: {
        games: [game('g1', -2 * HOUR), game('g2', HOUR)],
        initialPicks: { g1: LOCKED },
        userId: 'u1'
      }
    });

    // g1 kicked off: no card, no committed row, nowhere on the page.
    expect(screen.queryByTestId('game-card')).toBeInTheDocument(); // g2 is still pickable
    expect(screen.queryByTestId('committed-row')).not.toBeInTheDocument();
    expect(screen.queryByTestId('committed-section')).not.toBeInTheDocument();
    expect(screen.getByTestId('week-underway-strip')).toBeInTheDocument();
  });

  it('reports the underway week and links onward to /week', () => {
    render(PicksBoard, {
      props: {
        games: [
          game('g1', -2 * HOUR),
          game('g2', -3 * HOUR, { finalScores: { home: 27, away: 20 } }),
          game('g3', -4 * HOUR)
        ],
        initialPicks: {
          g1: LOCKED,
          g2: { ...LOCKED, outcome: 'win', pointsDelta: 3 }
          // g3: kicked off with no pick — the missed moment.
        },
        userId: 'u1'
      }
    });

    expect(screen.getByTestId('underway-in-play')).toHaveTextContent('2 in play');
    expect(screen.getByTestId('underway-final')).toHaveTextContent('1 final');
    expect(screen.getByTestId('underway-missed')).toHaveTextContent('1 missed');
    expect(screen.getByTestId('underway-points')).toHaveTextContent('+3');
    expect(screen.getByTestId('see-the-week')).toHaveAttribute('href', '/week');
  });

  it('is a designed state, not an empty husk, once every game has kicked off', () => {
    render(PicksBoard, {
      props: {
        games: [game('g1', -2 * HOUR), game('g2', -3 * HOUR)],
        initialPicks: { g1: LOCKED, g2: LOCKED },
        userId: 'u1'
      }
    });

    expect(screen.queryByTestId('game-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('committed-section')).not.toBeInTheDocument();
    expect(screen.getByTestId('week-underway-strip')).toBeInTheDocument();
    expect(screen.getByText('The week is underway')).toBeInTheDocument();
    expect(screen.getByTestId('see-the-week')).toBeInTheDocument();
  });

  it('renders no comment UI anywhere on the board', () => {
    render(PicksBoard, {
      props: {
        games: [game('g1', -2 * HOUR), game('g2', HOUR)],
        initialPicks: { g1: LOCKED, g2: LOCKED },
        userId: 'u1'
      }
    });

    expect(screen.queryByTestId('comments-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comment-composer')).not.toBeInTheDocument();
  });

  it('honours the frozen split in readonly mode rather than the wall clock', () => {
    // The demo's kickoff timestamps age past "now" in real time, so its started/not-started
    // split comes from `committedGameIds` (ADR-0026). g2 stays pickable despite a past kickoff.
    render(PicksBoard, {
      props: {
        games: [game('g1', -2 * HOUR), game('g2', -2 * HOUR)],
        initialPicks: { g1: LOCKED },
        userId: 'u1',
        readonly: true,
        weekHref: '/demo/week',
        committedGameIds: new Set(['g1'])
      }
    });

    expect(screen.getByTestId('week-underway-strip')).toBeInTheDocument();
    expect(screen.getByTestId('see-the-week')).toHaveAttribute('href', '/demo/week');
    // No write controls on a frozen board.
    expect(screen.queryByTestId('unlock-pick')).not.toBeInTheDocument();
  });
});
