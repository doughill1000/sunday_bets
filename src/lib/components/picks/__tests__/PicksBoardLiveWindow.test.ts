import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import Harness from './PicksBoardLiveHarness.svelte';
import { LIVE_WINDOW_MS } from '$lib/live/config';
import { queryKeys } from '$lib/query/keys';
import type { PickGame } from '$lib/types/games';
import type { PickEntry } from '$lib/types/picks';

// Regression cover for #822: the picks board kept rendering the last live payload forever once
// the live window closed. `enabled: false` stops TanStack from FETCHING but does not drop the
// cached data while the component observing it stays mounted, so the board has to gate the
// value it hands its children — not just the poll. The setup below reproduces that state
// directly: seed `['live-scores']`, then render with a kickoff that has already aged out.

const GAME_ID = 'game-1';

function makeGame(kickoffMsAgo: number): PickGame {
  return {
    id: GAME_ID,
    kickoff: new Date(Date.now() - kickoffMsAgo).toISOString(),
    home: 'PHI',
    away: 'DAL',
    homeTeamId: 1,
    awayTeamId: 2,
    spreadTeamId: 1,
    spreadValue: -3
  };
}

// A locked pick is what gives LockedPicksSection a cover to render; without one there is no
// live chip either way and the test would pass vacuously.
const LOCKED: Record<string, PickEntry> = {
  [GAME_ID]: {
    lockedPick: { team: 'home', weight: 'M' },
    lockedSpreadTeamId: 1,
    lockedSpreadValue: -3
  }
};

function clientWithCachedScores() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(queryKeys.liveScores(), {
    scores: {
      [GAME_ID]: {
        homeScore: 16,
        awayScore: 14,
        status: 'in_progress',
        displayClock: '12:47',
        period: 3
      }
    },
    fetchedAt: new Date().toISOString()
  });
  return client;
}

describe('PicksBoard live window gating', () => {
  it('renders the live cover while the game is inside its window', () => {
    render(Harness, {
      props: {
        client: clientWithCachedScores(),
        games: [makeGame(60 * 60 * 1000)], // kicked off 1h ago
        initialPicks: LOCKED
      }
    });

    expect(screen.getByTestId('live-flag')).toHaveTextContent(/live/i);
    expect(screen.getByTestId('live-cover')).toBeInTheDocument();
  });

  it('drops the cached payload once the window has closed', () => {
    render(Harness, {
      props: {
        client: clientWithCachedScores(),
        // Kicked off past LIVE_WINDOW_MS: the poll is disabled, but the cache above is still
        // warm — precisely the state that used to leave a frozen "LIVE · Q3 12:47" on screen.
        games: [makeGame(LIVE_WINDOW_MS + 60 * 60 * 1000)],
        initialPicks: LOCKED
      }
    });

    expect(screen.queryByTestId('live-flag')).not.toBeInTheDocument();
    expect(screen.queryByTestId('live-cover')).not.toBeInTheDocument();
    // The row is still there — it just falls back to its static presentation.
    expect(screen.getByTestId('committed-matchup')).toBeInTheDocument();
  });

  // The frozen public demo (ADR-0026) has no live window by construction — `liveWindowActive`
  // is hardcoded false by `readonly` so it never polls. Its snapshot must still render, so the
  // window gate has to be bypassed on that path rather than applied to it.
  it('still renders frozen scores in readonly mode, which has no live window at all', () => {
    render(Harness, {
      props: {
        client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
        games: [makeGame(LIVE_WINDOW_MS + 60 * 60 * 1000)],
        initialPicks: LOCKED,
        readonly: true,
        committedGameIds: new Set([GAME_ID]),
        frozenLiveScores: {
          [GAME_ID]: {
            homeScore: 16,
            awayScore: 14,
            status: 'final',
            displayClock: null,
            period: null
          }
        }
      }
    });

    expect(screen.getByTestId('live-flag')).toHaveTextContent(/final/i);
    expect(screen.getByTestId('live-cover')).toBeInTheDocument();
  });
});
