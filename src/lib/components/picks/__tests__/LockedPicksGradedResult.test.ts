import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import Harness from './PicksBoardLiveHarness.svelte';
import { LIVE_WINDOW_MS, STALE_THRESHOLD_MS } from '$lib/live/config';
import { queryKeys } from '$lib/query/keys';
import type { PickGame } from '$lib/types/games';
import type { PickEntry } from '$lib/types/picks';
import type { LiveScoreEntry } from '$lib/live/types';

// Regression cover for #823: a finished game on /picks rendered "⏱ Kicked off" and nothing
// else — no score, no verdict — indefinitely. The board hung its whole score row off the live
// ESPN feed, which ages out with its window (#822), and `PickGame` carried no final score to
// fall back to. These specs drive the real PicksBoard through each of the four states.

const HOME_ID = 1;
const AWAY_ID = 2;

function game(id: string, kickoffMsAgo: number, overrides: Partial<PickGame> = {}): PickGame {
  return {
    id,
    kickoff: new Date(Date.now() - kickoffMsAgo).toISOString(),
    home: 'PHI',
    away: 'DAL',
    homeTeamId: HOME_ID,
    awayTeamId: AWAY_ID,
    spreadTeamId: HOME_ID,
    spreadValue: -3,
    finalScores: null,
    ...overrides
  };
}

function homePick(overrides: Partial<PickEntry> = {}): PickEntry {
  return {
    lockedPick: { team: 'home', weight: 'M' },
    lockedSpreadTeamId: HOME_ID,
    lockedSpreadValue: -3,
    ...overrides
  };
}

function score(overrides: Partial<LiveScoreEntry> = {}): LiveScoreEntry {
  return {
    homeScore: 20,
    awayScore: 14,
    status: 'in_progress',
    displayClock: '12:47',
    period: 3,
    ...overrides
  };
}

function clientWith(scores: Record<string, LiveScoreEntry>, fetchedAtMsAgo = 0) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(queryKeys.liveScores(), {
    scores,
    fetchedAt: new Date(Date.now() - fetchedAtMsAgo).toISOString()
  });
  return client;
}

function emptyClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function rowFor(gameId: string) {
  const row = document.querySelector(`[data-testid="committed-row"][data-game-id="${gameId}"]`);
  if (!row) throw new Error(`no committed row for ${gameId}`);
  return within(row as HTMLElement);
}

describe('LockedPicksSection — graded fallback', () => {
  // The exact reproduction: graded hours ago, live window long closed, nothing on screen.
  it('shows the final score and settled outcome with no live feed at all', () => {
    render(Harness, {
      props: {
        client: emptyClient(),
        games: [
          game('g1', LIVE_WINDOW_MS + 60 * 60 * 1000, { finalScores: { home: 24, away: 17 } })
        ],
        initialPicks: { g1: homePick({ outcome: 'win', pointsDelta: 3 }) }
      }
    });

    expect(screen.getByTestId('graded-flag')).toHaveTextContent('Final');
    expect(screen.getByTestId('graded-result')).toHaveTextContent('DAL 17–24 PHI');
    expect(screen.getByTestId('graded-outcome')).toHaveTextContent('Win +3');
    // Not the bare fallback the issue reported.
    expect(screen.queryByText('⏱ Kicked off')).not.toBeInTheDocument();
  });

  it('colours the outcome with the settled token, not a live cover verdict', () => {
    render(Harness, {
      props: {
        client: emptyClient(),
        games: [game('g1', LIVE_WINDOW_MS + 1000, { finalScores: { home: 10, away: 30 } })],
        initialPicks: { g1: homePick({ outcome: 'loss', pointsDelta: -3 }) }
      }
    });

    const outcome = screen.getByTestId('graded-outcome');
    expect(outcome).toHaveTextContent('Loss −3');
    expect(outcome.className).toContain('text-destructive');
  });

  // A missed pick has nothing to project from, so before #823 the row was blank forever. The
  // graded read is the only thing that can speak for it.
  it('reports a missed pick from what grading actually wrote', () => {
    render(Harness, {
      props: {
        client: emptyClient(),
        games: [game('g1', LIVE_WINDOW_MS + 1000, { finalScores: { home: 24, away: 17 } })],
        initialPicks: { g1: { outcome: 'missed', pointsDelta: -1 } }
      }
    });

    expect(screen.getByTestId('committed-detail')).toHaveTextContent('No pick recorded');
    expect(screen.getByTestId('graded-result')).toHaveTextContent('DAL 17–24 PHI');
    expect(screen.getByTestId('graded-outcome')).toHaveTextContent('Missed −1');
  });

  // Precedence at the component level. Two games keep the live window open (a graded game is
  // excluded from it), so a real live payload is genuinely in scope for the graded row.
  it('never lets a live payload supersede a graded row', () => {
    render(Harness, {
      props: {
        client: clientWith({
          g1: score({ homeScore: 3, awayScore: 0, period: 1 }),
          g2: score()
        }),
        games: [
          game('g1', 60 * 60 * 1000, { finalScores: { home: 24, away: 17 } }),
          game('g2', 60 * 60 * 1000)
        ],
        initialPicks: { g1: homePick({ outcome: 'win', pointsDelta: 3 }), g2: homePick() }
      }
    });

    const graded = rowFor('g1');
    expect(graded.getByTestId('graded-result')).toHaveTextContent('DAL 17–24 PHI');
    expect(graded.queryByTestId('live-flag')).not.toBeInTheDocument();
    expect(graded.queryByTestId('live-cover')).not.toBeInTheDocument();

    // …while the ungraded sibling is untouched: live-window behaviour is unchanged.
    const live = rowFor('g2');
    expect(live.getByTestId('live-flag')).toHaveTextContent('LIVE');
    expect(live.getByTestId('live-cover')).toHaveTextContent('Q3');
    expect(live.getByTestId('live-verdict')).toHaveTextContent('Covering +3');
  });
});

describe('LockedPicksSection — unofficial final', () => {
  it('labels an ungraded FINAL feed score unofficial, visibly apart from a graded row', () => {
    render(Harness, {
      props: {
        client: clientWith({ g1: score({ status: 'final', displayClock: null, period: null }) }),
        games: [game('g1', 60 * 60 * 1000)],
        initialPicks: { g1: homePick() }
      }
    });

    expect(screen.getByTestId('live-flag')).toHaveTextContent('FINAL');
    expect(screen.getByTestId('live-cover')).toHaveTextContent('unofficial');
    expect(screen.queryByTestId('graded-flag')).not.toBeInTheDocument();
  });

  // #823's window change stops the poll once everything is final, which by itself would age
  // `fetchedAt` past the stale threshold and grey out a score that is not going to change.
  // A settled feed is terminal, not stale.
  it('holds a settled feed instead of flipping to Stale when the poll stops', () => {
    render(Harness, {
      props: {
        client: clientWith(
          { g1: score({ status: 'final', displayClock: null, period: null }) },
          STALE_THRESHOLD_MS * 10
        ),
        games: [game('g1', 60 * 60 * 1000)],
        initialPicks: { g1: homePick() }
      }
    });

    expect(screen.getByTestId('live-flag')).toHaveTextContent('FINAL');
    expect(screen.getByTestId('live-flag')).not.toHaveTextContent('Stale');
  });

  // …but a quiet IN-PROGRESS feed still clears, which is the case #822 built the guard for.
  it('still goes stale on a quiet in-progress feed', () => {
    render(Harness, {
      props: {
        client: clientWith({ g1: score() }, STALE_THRESHOLD_MS * 10),
        games: [game('g1', 60 * 60 * 1000)],
        initialPicks: { g1: homePick() }
      }
    });

    expect(screen.getByTestId('live-flag')).toHaveTextContent('Stale');
  });
});
