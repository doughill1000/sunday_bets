import { describe, expect, it } from 'vitest';
import { LIVE_WINDOW_MS, activeLiveScores, isWithinLiveWindow } from '../config';
import type { LiveScoreEntry } from '../types';

const KICKOFF = Date.UTC(2026, 7, 13, 23, 0, 0); // 2026-08-13 23:00Z, a real preseason TNF slot

function score(partial: Partial<LiveScoreEntry> = {}): LiveScoreEntry {
  return {
    homeScore: 16,
    awayScore: 14,
    status: 'in_progress',
    displayClock: '12:47',
    period: 3,
    ...partial
  };
}

describe('isWithinLiveWindow', () => {
  it('opens at kickoff and is half-open at the far edge', () => {
    expect(isWithinLiveWindow(KICKOFF, KICKOFF - 1)).toBe(false);
    expect(isWithinLiveWindow(KICKOFF, KICKOFF)).toBe(true);
    expect(isWithinLiveWindow(KICKOFF, KICKOFF + LIVE_WINDOW_MS - 1)).toBe(true);
    expect(isWithinLiveWindow(KICKOFF, KICKOFF + LIVE_WINDOW_MS)).toBe(false);
  });
});

describe('activeLiveScores', () => {
  it('passes the payload through while a game is inside its window', () => {
    const scores = { g1: score() };
    expect(activeLiveScores(scores, true)).toBe(scores);
  });

  // The #822 regression. TanStack's `enabled: false` stops the poll but keeps the cached
  // payload alive for as long as the component observing it stays mounted, so the caller can
  // still be holding a full mid-game payload here long after the window shut. Gating the fetch
  // is not enough — the value has to be gated too.
  it('drops a still-cached payload once every game has aged out', () => {
    const stale = { g1: score({ period: 3, displayClock: '12:47' }) };
    expect(activeLiveScores(stale, false)).toEqual({});
  });

  it('drops a cached FINAL just the same — outside the window the graded result is authority', () => {
    const stale = { g1: score({ status: 'final', displayClock: null, period: null }) };
    expect(activeLiveScores(stale, false)).toEqual({});
  });

  it('returns a stable identity when closed, so a 1s re-derive does not churn children', () => {
    expect(activeLiveScores({ g1: score() }, false)).toBe(activeLiveScores({ g2: score() }, false));
  });
});
